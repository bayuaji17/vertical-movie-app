import { expect, test } from 'bun:test'
import { QueryClient, onlineManager } from '@tanstack/react-query'
import { createSeriesClient } from '../src/lib/admin/series-client'
import {
  episodeDetailOptions,
  episodeListOptions,
  invalidateSeries,
  seasonListOptions,
  seriesKeys,
  seriesMutationOptions,
} from '../src/lib/admin/series-queries'
import { contentKeys } from '../src/lib/admin/content-queries'
import { publicationKeys } from '../src/lib/admin/publication-queries'
import { clearAdminPrivateQueries } from '../src/lib/auth/session-cache'

const seriesId = '00000000-0000-4000-8000-000000000001'
const seasonId = '00000000-0000-4000-8000-000000000002'
const episodeId = '00000000-0000-4000-8000-000000000003'
const other = '00000000-0000-4000-8000-000000000004'
const filters = { seriesId, seasonId, search: '', includeArchived: false }

test('private keys isolate session, Series, season, archive and search', () => {
  const key = seriesKeys.episodes('one', filters)
  for (const changed of [
    { ...filters, seriesId: other },
    { ...filters, seasonId: other },
    { ...filters, search: 'new' },
    { ...filters, includeArchived: true },
  ])
    expect(seriesKeys.episodes('one', changed)).not.toEqual(key)
  expect(seriesKeys.episodes('two', filters)).not.toEqual(key)
  expect(seriesKeys.seasons('one', seriesId, false)).not.toEqual(
    seriesKeys.seasons('one', seriesId, true),
  )
  expect(seriesKeys.episode('one', seriesId, episodeId)).not.toEqual(
    seriesKeys.episode('two', seriesId, episodeId),
  )
})

test('query factories disable SSR reads, use terminal null cursor and do not retry', async () => {
  const cache = new QueryClient(),
    cursors: Array<string | null> = []
  const api = createSeriesClient('http://localhost/api', cache, async (url) => {
    const cursor = new URL(String(url)).searchParams.get('cursor')
    cursors.push(cursor)
    return Response.json({ items: [], nextCursor: cursor ? null : 'page2' })
  })
  const options = episodeListOptions(api, 'one', filters)
  expect(options.enabled).toBe(false)
  expect(options.retry).toBe(false)
  const first = await cache.fetchInfiniteQuery(options)
  expect(first.pageParams).toEqual([undefined])
  const second = await cache.fetchInfiniteQuery({
    ...options,
    pages: 2,
    staleTime: 0,
  })
  expect(second.pageParams).toEqual([undefined, 'page2'])
  expect(
    options.getNextPageParam(
      second.pages[1],
      second.pages,
      'page2',
      second.pageParams,
    ),
  ).toBeUndefined()
  expect(cursors).toEqual([null, null, 'page2'])
  expect(seasonListOptions(api, 'one', seriesId).enabled).toBe(false)
  expect(episodeDetailOptions(api, 'one', seriesId, episodeId).enabled).toBe(
    false,
  )
  cache.clear()
})

test('unconfigured reads reject with configuration code', async () => {
  const cache = new QueryClient()
  await expect(
    cache.fetchQuery(seasonListOptions(undefined, 'one', seriesId)),
  ).rejects.toMatchObject({ code: 'CONFIG_UNAVAILABLE' })
  cache.clear()
})

test('canceled late hierarchy read cannot fill private cache', async () => {
  const cache = new QueryClient()
  let release!: () => void
  let started!: () => void
  const waiting = new Promise<void>((resolve) => {
      release = resolve
    }),
    begin = new Promise<void>((resolve) => {
      started = resolve
    })
  let signal: AbortSignal | null | undefined
  const api = createSeriesClient(
    'http://localhost/api',
    cache,
    async (_, init) => {
      signal = init?.signal
      started()
      await waiting
      return Response.json({ items: [] })
    },
  )
  const options = seasonListOptions(api, 'one', seriesId)
  const result = cache.fetchQuery(options).catch((error) => error)
  await begin
  await cache.cancelQueries({ queryKey: options.queryKey })
  release()
  await result
  expect(signal?.aborted).toBe(true)
  expect(cache.getQueryData(options.queryKey)).toBeUndefined()
  cache.clear()
})

test('metadata invalidation stays with its session/Series and marks related readiness stale without refetch', async () => {
  const cache = new QueryClient(),
    list = contentKeys.lists('one'),
    detail = contentKeys.detail('one', 'series', seriesId),
    readiness = publicationKeys.video('one', episodeId)
  const matching = [
    seriesKeys.seasons('one', seriesId, false),
    seriesKeys.episodes('one', filters),
    seriesKeys.episode('one', seriesId, episodeId),
    list,
    detail,
    readiness,
  ]
  const retained = [
    seriesKeys.seasons('two', seriesId, false),
    seriesKeys.seasons('one', other, false),
    ['public', 'catalog'],
  ]
  for (const key of [...matching, ...retained])
    cache.setQueryData(key, { value: true })
  await invalidateSeries(cache, 'one', seriesId, episodeId)
  for (const key of matching)
    expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
  for (const key of retained)
    expect(cache.getQueryState(key)?.isInvalidated).toBe(false)
  cache.clear()
})

test('offline uncertain POST fails once without pause, replay or optimistic data', async () => {
  const cache = new QueryClient()
  let calls = 0
  const api = createSeriesClient('http://localhost/api', cache, async () => {
    calls++
    throw new TypeError('Disconnected')
  })
  const options = seriesMutationOptions(api, 'one', seriesId)
  expect(options.retry).toBe(false)
  expect(options.networkMode).toBe('always')
  onlineManager.setOnline(false)
  try {
    const mutation = cache.getMutationCache().build(cache, options)
    await expect(
      mutation.execute({ action: 'create-season', input: { seasonNumber: 2 } }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(mutation.state.isPaused).toBe(false)
    expect(mutation.state.data).toBeUndefined()
    expect(calls).toBe(1)
    expect(
      cache.getQueryData(seriesKeys.seasons('one', seriesId, false)),
    ).toBeUndefined()
    await clearAdminPrivateQueries(cache)
    expect(cache.getMutationCache().getAll()).toHaveLength(0)
  } finally {
    onlineManager.setOnline(true)
    cache.clear()
  }
})
