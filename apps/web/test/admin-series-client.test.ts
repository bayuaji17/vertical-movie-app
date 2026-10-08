import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { createSeriesClient } from '../src/lib/admin/series-client'
import { ContentApiError } from '../src/lib/admin/content-client'
import { seriesKeys } from '../src/lib/admin/series-queries'

const seriesId = '00000000-0000-4000-8000-000000000001'
const seasonId = '00000000-0000-4000-8000-000000000002'
const episodeId = '00000000-0000-4000-8000-000000000003'
const other = '00000000-0000-4000-8000-000000000004'
const audit = {
  rowVersion: 1,
  archivedAt: null,
  createdAt: '2026-10-08T00:00:00Z',
  updatedAt: '2026-10-08T00:00:00Z',
}
const season = {
  ...audit,
  id: seasonId,
  seriesId,
  seasonNumber: 1,
  title: null,
  description: null,
  releaseYear: null,
  releaseDate: null,
}
const episode = {
  ...audit,
  id: episodeId,
  kind: 'episode',
  seasonId,
  episodeNumber: 1,
  title: 'Episode',
  slug: 'episode',
  publicationStatus: 'draft',
  genreIds: [],
  series: { id: seriesId, title: 'Series', slug: 'series' },
  season: { id: seasonId, seasonNumber: 1, title: null },
  effectiveGenres: [],
}
const filters = {
  seriesId,
  seasonId,
  search: '雨 & rain',
  includeArchived: false,
}

test('private hierarchy reads serialize filters and cursor with credentials, no-store and caller cancellation', async () => {
  const requests: Request[] = [],
    controller = new AbortController()
  const api = createSeriesClient(
    'http://localhost/api',
    new QueryClient(),
    async (url, init) => {
      const request = new Request(url, init)
      requests.push(request)
      expect(request.credentials).toBe('include')
      expect(request.cache).toBe('no-store')
      expect(init?.signal).toBe(controller.signal)
      return Response.json(
        request.url.includes('/seasons')
          ? { items: [season] }
          : { items: [episode], nextCursor: 'next' },
      )
    },
  )
  expect(
    (await api.seasons(seriesId, true, controller.signal)).items,
  ).toHaveLength(1)
  expect(
    (await api.episodes(filters, 'opaque+/=', controller.signal)).items[0]
      .series.id,
  ).toBe(seriesId)
  const url = new URL(requests[1].url)
  expect(url.pathname).toBe('/api/admin/videos')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    kind: 'episode',
    seriesId,
    seasonId,
    search: filters.search,
    includeArchived: 'false',
    limit: '20',
    cursor: 'opaque+/=',
  })
  expect(new URL(requests[0].url).searchParams.get('includeArchived')).toBe(
    'true',
  )
})

test('season and episode writes preserve exact body, endpoint and record versions', async () => {
  const reads: Array<{ path: string; method: string; body: unknown }> = []
  const controller = new AbortController()
  const api = createSeriesClient(
    'http://localhost/api',
    new QueryClient(),
    async (url, init) => {
      const request = new Request(url, init),
        body = await request.json()
      reads.push({
        path: new URL(request.url).pathname,
        method: request.method,
        body,
      })
      expect(init?.signal).toBe(controller.signal)
      expect(request.credentials).toBe('include')
      expect(request.cache).toBe('no-store')
      const rowVersion =
        request.method === 'PATCH' ? body.expectedVersion + 1 : 1
      return Response.json(
        request.url.includes('seasons')
          ? { ...season, seasonNumber: body.seasonNumber ?? 1, rowVersion }
          : { ...episode, rowVersion },
      )
    },
  )
  await api.createSeason(
    seriesId,
    { seasonNumber: 2, title: 'Second' },
    controller.signal,
  )
  await api.patchSeason(
    seriesId,
    seasonId,
    { expectedVersion: 3, title: null },
    controller.signal,
  )
  await api.createEpisode(
    { kind: 'episode', title: 'Episode', seasonId, episodeNumber: 1 },
    controller.signal,
  )
  await api.patchEpisode(
    episodeId,
    { expectedVersion: 2, rightsConfirmed: true },
    controller.signal,
  )
  expect(reads).toEqual([
    {
      path: '/api/admin/series/' + seriesId + '/seasons',
      method: 'POST',
      body: { seasonNumber: 2, title: 'Second' },
    },
    {
      path: '/api/admin/seasons/' + seasonId,
      method: 'PATCH',
      body: { expectedVersion: 3, title: null },
    },
    {
      path: '/api/admin/videos',
      method: 'POST',
      body: { kind: 'episode', title: 'Episode', seasonId, episodeNumber: 1 },
    },
    {
      path: '/api/admin/videos/' + episodeId,
      method: 'PATCH',
      body: { expectedVersion: 2, rightsConfirmed: true },
    },
  ])
})

test('malformed, cross-series, cross-season, wrong-kind and duplicate pages are rejected before caching', async () => {
  for (const body of [
    {},
    { items: [episode] },
    { items: [{ ...episode, kind: 'movie' }], nextCursor: null },
    {
      items: [{ ...episode, series: { ...episode.series, id: other } }],
      nextCursor: null,
    },
    { items: [{ ...episode, seasonId: other }], nextCursor: null },
    { items: [{ ...episode, rowVersion: 0 }], nextCursor: null },
    { items: [{ ...episode, id: 'not-a-uuid' }], nextCursor: null },
    { items: [{ ...episode, archivedAt: audit.createdAt }], nextCursor: null },
    { items: [episode, episode], nextCursor: null },
    { items: [], nextCursor: '' },
    { items: [], nextCursor: 'current' },
    { items: Array.from({ length: 21 }, () => episode), nextCursor: null },
  ]) {
    const api = createSeriesClient(
      'http://localhost/api',
      new QueryClient(),
      async () => Response.json(body),
    )
    await expect(api.episodes(filters, 'current')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 0,
    })
  }
})

test('season lists reject cross-owner, invalid number, archive leakage and duplicates', async () => {
  for (const row of [
    { ...season, seriesId: other },
    { ...season, seasonNumber: 0 },
    { ...season, title: 1 },
    { ...season, rowVersion: NaN },
    { ...season, archivedAt: audit.createdAt },
  ]) {
    const api = createSeriesClient(
      'http://localhost/api',
      new QueryClient(),
      async () => Response.json({ items: [row] }),
    )
    await expect(api.seasons(seriesId)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  }
  const api = createSeriesClient(
    'http://localhost/api',
    new QueryClient(),
    async () => Response.json({ items: [season, season] }),
  )
  await expect(api.seasons(seriesId)).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  })
})

test('a detail read cannot confirm another episode identity or parent Series', async () => {
  for (const row of [
    { ...episode, id: other },
    { ...episode, series: { ...episode.series, id: other } },
    { ...episode, season: null },
  ]) {
    const api = createSeriesClient(
      'http://localhost/api',
      new QueryClient(),
      async () => Response.json(row),
    )
    await expect(api.episode(seriesId, episodeId)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  }
  const api = createSeriesClient(
    'http://localhost/api',
    new QueryClient(),
    async () => Response.json(episode),
  )
  expect((await api.episode(seriesId, episodeId)).id).toBe(episodeId)
})

test('wrong version, identity, grouping or state 2xx cannot confirm a write', async () => {
  for (const row of [
    season,
    { ...season, rowVersion: 2, id: other },
    { ...season, rowVersion: 2, seriesId: other },
    { ...season, rowVersion: 2, archivedAt: audit.createdAt },
  ]) {
    const api = createSeriesClient(
      'http://localhost/api',
      new QueryClient(),
      async () => Response.json(row),
    )
    await expect(
      api.patchSeason(seriesId, seasonId, {
        expectedVersion: 1,
        title: 'Changed',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  }
  for (const row of [
    episode,
    { ...episode, rowVersion: 2, kind: 'movie' },
    { ...episode, rowVersion: 2, publicationStatus: 'published' },
    { ...episode, rowVersion: 2, seasonId: other },
    { ...episode, rowVersion: 2, episodeNumber: 9 },
  ]) {
    const api = createSeriesClient(
      'http://localhost/api',
      new QueryClient(),
      async () => Response.json(row),
    )
    await expect(
      api.patchEpisode(episodeId, {
        expectedVersion: 1,
        seasonId,
        episodeNumber: 1,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  }
  for (const row of [
    { ...episode, seasonId: other },
    { ...episode, episodeNumber: 2 },
    { ...episode, publicationStatus: 'published' },
  ]) {
    const api = createSeriesClient(
      'http://localhost/api',
      new QueryClient(),
      async () => Response.json(row),
    )
    await expect(
      api.createEpisode({
        kind: 'episode',
        title: 'Episode',
        seasonId,
        episodeNumber: 1,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  }
})

test('domain HTTP failures preserve codes and never become success data', async () => {
  for (const status of [403, 404, 409, 422, 503]) {
    const api = createSeriesClient(
      'http://localhost/api',
      new QueryClient(),
      async () =>
        Response.json(
          {
            error: {
              code: 'SEASON_NUMBER_CONFLICT',
              message: 'private database detail',
            },
          },
          { status },
        ),
    )
    await expect(
      api.createSeason(seriesId, { seasonNumber: 2 }),
    ).rejects.toMatchObject({
      status,
      code: 'SEASON_NUMBER_CONFLICT',
      message: 'Series content request failed.',
    })
  }
})

test('401 cleans every private hierarchy resource and leaves public data', async () => {
  const cache = new QueryClient()
  cache.setQueryData(seriesKeys.seasons('old-session', seriesId, false), {
    items: [season],
  })
  cache.setQueryData(seriesKeys.episodes('old-session', filters), {
    pages: [{ items: [episode] }],
  })
  cache.setQueryData(['public', 'catalog'], { public: true })
  const api = createSeriesClient('http://localhost/api', cache, async () =>
    Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 }),
  )
  await expect(api.seasons(seriesId)).rejects.toBeInstanceOf(ContentApiError)
  expect(cache.getQueryCache().findAll({ queryKey: ['admin'] })).toHaveLength(0)
  expect(
    cache.getQueryData<{ public: boolean }>(['public', 'catalog']),
  ).toEqual({ public: true })
})

test('network and cancellation remain distinct and invalid IDs never issue a request', async () => {
  let calls = 0
  const api = createSeriesClient(
    'http://localhost/api',
    new QueryClient(),
    async (_, init) => {
      calls++
      if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      throw new TypeError('Disconnected')
    },
  )
  const controller = new AbortController()
  controller.abort()
  await expect(
    api.seasons(seriesId, false, controller.signal),
  ).rejects.toHaveProperty('name', 'AbortError')
  await expect(
    api.createSeason(seriesId, { seasonNumber: 1 }),
  ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  await expect(api.seasons('../escape')).rejects.toMatchObject({
    code: 'INVALID_INPUT',
  })
  expect(calls).toBe(2)
})
