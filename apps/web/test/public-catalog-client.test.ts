import { expect, test } from 'bun:test'
import { QueryClient, dehydrate } from '@tanstack/react-query'
import {
  createPublicCatalogClient,
  CatalogRequestError,
} from '../src/lib/catalog/catalog-client'
import { defaultCatalogFilters as defaults } from '../src/lib/catalog/public-catalog-model'
import { loadPublicCatalog } from '../src/lib/catalog/public-catalog-queries'

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const movie = {
  id: id(1),
  slug: 'film',
  kind: 'movie',
  title: 'A real film',
  synopsis: 'Story',
  publishedAt: '2026-10-01T00:00:00.123456Z',
  genres: [],
  posterPath: `/catalog/movie/${id(1)}/poster`,
  durationMs: 60_000,
}
const page = { items: [movie], total: 1, nextCursor: null, freshForMs: 1 }
test('public Eden adapter sends canonical query/abort, omits credentials and validates poster identity with remaining TTL', async () => {
  let request: Request | undefined
  let options: RequestInit | undefined
  const client = createPublicCatalogClient(
    'http://localhost/api',
    async (input, init) => {
      options = init
      request = new Request(input, init)
      return Response.json(page)
    },
    () => 100,
  )
  const signal = new AbortController().signal
  const data = await client.page(
    { ...defaults, search: ' Rain ', kind: 'movie' },
    null,
    signal,
  )
  expect(options!.credentials).toBe('omit')
  expect(options!.cache).toBe('no-store')
  expect(request!.signal.aborted).toBe(false)
  const url = new URL(request!.url)
  expect(url.pathname).toBe('/api/catalog')
  expect(url.searchParams.get('search')).toBe('rain')
  expect(url.searchParams.get('limit')).toBe('6')
  expect(url.searchParams.has('cursor')).toBe(false)
  expect(data.expiresAt).toBe(101)
  expect(data.items[0].poster).toBe('/api' + movie.posterPath)
  expect(data.items[0].genres).toEqual([])
})
test('API errors and malformed/private data never become empty or clear unrelated admin cache', async () => {
  const cache = new QueryClient()
  cache.setQueryData(['admin', 'sentinel'], { keep: true })
  for (const status of [401, 403, 503])
    await expect(
      createPublicCatalogClient('http://localhost/api', async () =>
        Response.json(
          { error: { message: 'private diagnostics' } },
          { status },
        ),
      ).page(defaults, null, new AbortController().signal),
    ).rejects.toBeInstanceOf(CatalogRequestError)
  for (const body of [
    { ...page, items: [{ ...movie, sourceKey: 'private' }] },
    {
      ...page,
      items: [{ ...movie, posterPath: 'https://private.example/source' }],
    },
    { ...page, items: [{ ...movie, kind: 'episode' }] },
    { items: [] },
  ])
    await expect(
      createPublicCatalogClient('http://localhost/api', async () =>
        Response.json(body),
      ).page(defaults, null, new AbortController().signal),
    ).rejects.toBeInstanceOf(CatalogRequestError)
  expect(cache.getQueryData<{ keep: boolean }>(['admin', 'sentinel'])).toEqual({
    keep: true,
  })
  cache.clear()
})
test('all visible genre pages are collected beyond 100 with repeated-cursor guard', async () => {
  let reads = 0
  const api = createPublicCatalogClient(
    'http://localhost/api',
    async (input) => {
      const cursor = new URL(String(input)).searchParams.get('cursor')
      reads++
      return Response.json({
        items: Array.from({ length: cursor ? 1 : 100 }, (_, n) => ({
          id: id(cursor ? 101 : n + 1),
          slug: 'g' + n,
          name: 'Genre ' + n,
        })),
        nextCursor: cursor ? null : 'next',
        freshForMs: 50,
      })
    },
  )
  expect((await api.genres(new AbortController().signal)).items).toHaveLength(
    101,
  )
  expect(reads).toBe(2)
  await expect(
    createPublicCatalogClient('http://localhost/api', async () =>
      Response.json({ items: [], nextCursor: 'repeat', freshForMs: 1 }),
    ).genres(new AbortController().signal),
  ).rejects.toBeInstanceOf(CatalogRequestError)
})
test('SSR bootstrap reads three sections concurrently, first page only and isolates requests; errors serialize as safe flags', async () => {
  const first = new QueryClient(),
    second = new QueryClient()
  let starts = 0,
    release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  const api = createPublicCatalogClient('http://localhost', async (input) => {
    starts++
    if (starts === 3) release()
    await held
    const path = new URL(String(input)).pathname
    return Response.json(
      path.endsWith('/genres')
        ? { items: [], nextCursor: null, freshForMs: 60_000 }
        : path.endsWith('/featured')
          ? { item: null, freshForMs: 60_000 }
          : { ...page, freshForMs: 60_000, nextCursor: 'page-two' },
    )
  })
  expect(await loadPublicCatalog(first, api)).toEqual({
    catalogFailed: false,
    genresFailed: false,
    featuredFailed: false,
  })
  expect(starts).toBe(3)
  expect(dehydrate(first).queries).toHaveLength(3)
  expect(dehydrate(second).queries).toHaveLength(0)
  const broken = createPublicCatalogClient('http://localhost', async () => {
    throw Error('SECRET internal API URL')
  })
  const result = await loadPublicCatalog(second, broken)
  expect(result).toEqual({
    catalogFailed: true,
    genresFailed: true,
    featuredFailed: true,
  })
  expect(dehydrate(second).queries).toHaveLength(0)
  expect(JSON.stringify(result)).not.toContain('SECRET')
  first.clear()
  second.clear()
})
test('query cancellation reaches Eden fetch', async () => {
  const controller = new AbortController()
  let seen = false
  let started!: () => void
  const ready = new Promise<void>((resolve) => (started = resolve))
  const api = createPublicCatalogClient(
    'http://localhost',
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init!.signal!.addEventListener(
          'abort',
          () => {
            seen = true
            reject(Error('cancelled'))
          },
          { once: true },
        )
        started()
      }),
  )
  const pending = api.page(defaults, null, controller.signal)
  await ready
  controller.abort()
  await expect(pending).rejects.toBeDefined()
  expect(seen).toBe(true)
})
