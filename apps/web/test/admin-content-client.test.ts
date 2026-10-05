import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  createContentClient,
  ContentApiError,
} from '../src/lib/admin/content-client'
import {
  createContentOptions,
  patchContentOptions,
  contentKeys,
} from '../src/lib/admin/content-queries'
import { clearAdminPrivateQueries } from '../src/lib/auth/session-cache'

const filters = {
  type: 'film',
  search: 'rain',
  page: 2,
  pageSize: 3,
  includeArchived: true,
} as const
test('Eden forwards typed filters, credentials, no-store and AbortSignal', async () => {
  const controller = new AbortController()
  const api = createContentClient(
    'http://localhost/api',
    new QueryClient(),
    async (url, init) => {
      const request = new Request(url, init)
      const u = new URL(request.url)
      expect(u.pathname).toBe('/api/admin/content')
      expect(u.searchParams.get('pageSize')).toBe('3')
      expect(u.searchParams.get('type')).toBe('film')
      expect(request.credentials).toBe('include')
      expect(request.cache).toBe('no-store')
      expect(init?.signal).toBe(controller.signal)
      return Response.json({
        items: [],
        total: 0,
        page: 2,
        pageSize: 3,
        totalPages: 0,
      })
    },
  )
  expect((await api.list(filters, controller.signal)).page).toBe(2)
})
test('HTTP failures never become success data and codes are preserved', async () => {
  for (const status of [403, 404, 409, 422, 503]) {
    const api = createContentClient(
      'http://localhost/api',
      new QueryClient(),
      async () =>
        Response.json(
          {
            error: {
              code: 'SLUG_CONFLICT',
              message: 'private message',
              requestId: 'fixture',
            },
          },
          { status },
        ),
    )
    await expect(api.list(filters)).rejects.toMatchObject({
      status,
      code: 'SLUG_CONFLICT',
    })
  }
})
test('401 removes private cache while keeping public catalog', async () => {
  const cache = new QueryClient()
  cache.setQueryData(contentKeys.list('first-admin', filters), { secret: true })
  cache.setQueryData(['public', 'catalog'], { public: true })
  const api = createContentClient('http://localhost/api', cache, async () =>
    Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 }),
  )
  await expect(api.list(filters)).rejects.toBeInstanceOf(ContentApiError)
  expect(
    cache.getQueryData(contentKeys.list('first-admin', filters)),
  ).toBeUndefined()
  expect(
    cache.getQueryData<{ public: boolean }>(['public', 'catalog']),
  ).toEqual({ public: true })
})
test('abort remains cancellation, mutations never replay and Series uses nested response', async () => {
  let calls = 0
  const api = createContentClient(
    'http://localhost/api',
    new QueryClient(),
    async (url, init) => {
      calls++
      if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      expect(new URL(String(url)).pathname).toBe('/api/admin/series')
      expect(JSON.parse(String(init?.body))).toEqual({ title: 'Series' })
      return Response.json(
        {
          series: {
            id: '00000000-0000-4000-8000-000000000001',
            title: 'Series',
            slug: 'series',
            rowVersion: 1,
          },
          defaultSeason: {
            id: '00000000-0000-4000-8000-000000000002',
            seriesId: '00000000-0000-4000-8000-000000000001',
            seasonNumber: 1,
          },
        },
        { status: 201 },
      )
    },
  )
  const abort = new AbortController()
  abort.abort()
  await expect(api.list(filters, abort.signal)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  const options = createContentOptions(api)
  expect(options.retry).toBe(false)
  expect(patchContentOptions(api).retry).toBe(false)
  const result = await options.mutationFn!(
    { type: 'series', input: { title: 'Series' } },
    {} as never,
  )
  expect(result).toEqual({
    type: 'series',
    id: '00000000-0000-4000-8000-000000000001',
  })
  expect(calls).toBe(2)
})
test('identity keys isolate data, cleanup handles every content resource', async () => {
  const cache = new QueryClient()
  expect(contentKeys.detail('one', 'film', 'id')).not.toEqual(
    contentKeys.detail('two', 'film', 'id'),
  )
  for (const type of ['film', 'standalone', 'series'] as const)
    cache.setQueryData(contentKeys.detail('one', type, 'id'), { type })
  await clearAdminPrivateQueries(cache)
  expect(cache.getQueryCache().findAll({ queryKey: ['admin'] })).toHaveLength(0)
})

test('a network failure executes one POST and never creates confirmed cache data', async () => {
  const cache = new QueryClient()
  let calls = 0
  const api = createContentClient('http://localhost/api', cache, async () => {
    calls++
    throw new TypeError('Disconnected')
  })
  const mutation = cache
    .getMutationCache()
    .build(cache, createContentOptions(api))
  await expect(
    mutation.execute({
      type: 'film',
      input: { kind: 'movie', title: 'Draft' },
    }),
  ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  expect(calls).toBe(1)
  expect(mutation.state.data).toBeUndefined()
  expect(() =>
    createContentClient('http://user:secret@localhost', cache),
  ).toThrow('Invalid API base URL')
})

test('malformed 2xx write responses never count as confirmed saves', async () => {
  const cache = new QueryClient()
  const id = '00000000-0000-4000-8000-000000000001'
  for (const body of [
    {},
    { id, title: 'Draft', slug: 'draft', rowVersion: 1 },
  ]) {
    const api = createContentClient('http://localhost/api', cache, async () =>
      Response.json(body),
    )
    await expect(api.createSeries({ title: 'Draft' })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 0,
    })
    await expect(
      api.patchVideo(id, { title: 'Changed', expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 0 })
  }
  cache.clear()
})
