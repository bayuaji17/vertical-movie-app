import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  GenresApiError,
  createGenresClient,
  verifiedGenre,
} from '../src/lib/admin/genres-client'
import {
  genreErrorMessage,
  genreInput,
  slugifyGenreName,
  validateGenreName,
  validateGenreSlug,
} from '../src/lib/admin/genres-form'
import {
  createGenreOptions,
  genreListOptions,
  genresKeys,
  invalidateGenres,
} from '../src/lib/admin/genres-queries'
import { memoryGenresClient } from './fixtures/genres-memory-client'

const genre = (name: string, n = 1) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name,
  slug: slugifyGenreName(name),
  createdAt: '2026-10-10T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
})

test('live client lists with search/cursor and creates through the existing admin endpoints', async () => {
  const seen: Request[] = []
  const client = createGenresClient(
    'http://localhost/api',
    new QueryClient(),
    async (input, init) => {
      const request = new Request(input, init)
      seen.push(request)
      return request.method === 'POST'
        ? Response.json(genre('Sci-Fi'), { status: 201 })
        : Response.json({ items: [genre('Drama')], nextCursor: 'c2' })
    },
  )
  expect(await client.list('dr', 'c1')).toEqual({
    items: [genre('Drama')],
    nextCursor: 'c2',
  })
  expect(await client.create({ name: 'Sci-Fi' })).toEqual(genre('Sci-Fi'))
  expect(seen[0]?.method).toBe('GET')
  const url = new URL(seen[0].url)
  expect(url.pathname).toBe('/api/admin/genres')
  expect(url.searchParams.get('search')).toBe('dr')
  expect(url.searchParams.get('cursor')).toBe('c1')
  expect(url.searchParams.get('limit')).toBe('20')
  expect(seen[1]?.method).toBe('POST')
  expect(await seen[1]?.json()).toEqual({ name: 'Sci-Fi' })
  expect(seen[1]?.credentials).toBe('include')
})

test('live client reports edit as unavailable and never calls a missing endpoint', async () => {
  let calls = 0
  const client = createGenresClient(
    'http://localhost/api',
    new QueryClient(),
    async () => {
      calls++
      return Response.json({})
    },
  )
  expect(client.canEdit).toBe(false)
  for (const attempt of [
    () => client.rename(genre('A').id, { name: 'B' }),
    () => client.remove(genre('A').id),
  ]) {
    const error = await attempt().then(
      () => undefined,
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(GenresApiError)
    expect((error as GenresApiError).code).toBe('GENRES_EDIT_UNAVAILABLE')
  }
  expect(calls).toBe(0)
})

test('malformed genre payloads are rejected before reaching the cache', async () => {
  for (const bad of [
    null,
    { ...genre('A'), id: 'not-a-uuid' },
    { ...genre('A'), slug: 1 },
    { id: genre('A').id },
  ])
    expect(() => verifiedGenre(bad)).toThrow(
      'The response could not be confirmed.',
    )
  const client = createGenresClient(
    'http://localhost/api',
    new QueryClient(),
    async () => Response.json({ items: [{ id: 'x' }], nextCursor: null }),
  )
  expect(await client.list('').catch((e: unknown) => e)).toBeInstanceOf(
    GenresApiError,
  )
})

test('form helpers validate names and slugs and only send an edited slug', () => {
  expect(slugifyGenreName('  Sci-Fi & Fantasy! ')).toBe('sci-fi-fantasy')
  expect(slugifyGenreName('Café Noir')).toBe('cafe-noir')
  expect(validateGenreName('  ')).toBe('Enter a genre name.')
  expect(validateGenreName('x'.repeat(81))).toContain('at most 80')
  expect(validateGenreName('😀'.repeat(80))).toBeUndefined()
  expect(validateGenreSlug('')).toBeUndefined()
  expect(validateGenreSlug('Bad Slug')).toContain('lowercase')
  expect(validateGenreSlug('ok-slug')).toBeUndefined()
  expect(genreInput(' Drama ', 'drama', false)).toEqual({ name: 'Drama' })
  expect(genreInput('Drama', ' drama-2 ', true)).toEqual({
    name: 'Drama',
    slug: 'drama-2',
  })
})

test('error messages are specific, safe and never expose server values', () => {
  const make = (status: number, code: string) =>
    new GenresApiError(status, code, 'raw server text')
  expect(genreErrorMessage(make(409, 'SLUG_CONFLICT'))).toContain('slug')
  expect(genreErrorMessage(make(409, 'GENRE_IN_USE'))).toContain('used by')
  expect(genreErrorMessage(make(501, 'GENRES_EDIT_UNAVAILABLE'))).toContain(
    "isn't available",
  )
  expect(genreErrorMessage(make(0, 'X'))).toContain('could not be confirmed')
  for (const status of [0, 401, 403, 404, 409, 422, 500])
    expect(genreErrorMessage(make(status, 'X'))).not.toContain('raw server')
  expect(genreErrorMessage(new Error('boom'))).toContain(
    'could not be confirmed',
  )
})

test('queries live under the admin identity prefix and invalidate only genre lists', async () => {
  const cache = new QueryClient()
  const { client, calls } = memoryGenresClient([{ name: 'Drama' }])
  const options = genreListOptions(client, 'admin-1', '')
  expect([...options.queryKey]).toEqual([
    'admin',
    'admin-1',
    'genres',
    'list',
    '',
  ])
  await cache.fetchInfiniteQuery(options)
  cache.setQueryData(['admin', 'admin-1', 'content', 'list'], 'keep')
  await invalidateGenres(cache, 'admin-1')
  expect(cache.getQueryState(options.queryKey)?.isInvalidated).toBe(true)
  expect(
    cache.getQueryState(['admin', 'admin-1', 'content', 'list'])?.isInvalidated,
  ).toBeFalsy()
  expect(calls).toEqual(['list::'])
  expect(genresKeys.mutation('admin-1', 'create')[0]).toBe('admin')
  expect(createGenreOptions(client, 'admin-1').retry).toBe(false)
})
