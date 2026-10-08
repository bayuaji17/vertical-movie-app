import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  createDashboardClient,
  verifiedDashboardSummary,
} from '../src/lib/admin/dashboard-client'
import {
  dashboardKeys,
  dashboardPollInterval,
  dashboardSummaryOptions,
  invalidateDashboard,
} from '../src/lib/admin/dashboard-queries'
import { clearAdminPrivateQueries } from '../src/lib/auth/session-cache'

const zero = () => ({
  total: 0,
  draft: 0,
  published: 0,
  archived: 0,
  unpublished: 0,
})
export const summary = () => ({
  generatedAt: '2026-10-08T00:00:00.000Z',
  content: {
    film: zero(),
    standalone: zero(),
    series: zero(),
    episode: zero(),
  },
  media: { queued: 0, running: 0, retry: 0, failed: 0 },
  latestContent: [],
  failedMedia: [],
})
test('summary client follows gateway GET, credentials/cache and validates before caching', async () => {
  const cache = new QueryClient()
  let seen: Request | undefined
  const client = createDashboardClient(
    'http://localhost/api',
    cache,
    async (input, init) => {
      seen = new Request(input, init)
      return Response.json(summary())
    },
  )
  expect(
    await cache.fetchQuery(dashboardSummaryOptions(client, 'admin')),
  ).toEqual(summary())
  expect(seen?.url).toBe('http://localhost/api/admin/dashboard/summary')
  expect(seen?.method).toBe('GET')
  expect(seen?.credentials).toBe('include')
  expect(seen?.cache).toBe('no-store')
  cache.clear()
})
test('strict dashboard invariants reject malformed payloads', () => {
  const wrong = [
    { ...summary(), secret: 'raw' },
    { ...summary(), generatedAt: 'bad' },
    { ...summary(), media: { queued: -1, running: 0, retry: 0, failed: 0 } },
    {
      ...summary(),
      content: { ...summary().content, film: { ...zero(), total: 1 } },
    },
    {
      ...summary(),
      content: {
        ...summary().content,
        episode: { ...zero(), total: 1, unpublished: 1 },
      },
    },
    { ...summary(), latestContent: [{ id: 'invalid' }] },
  ]
  for (const value of wrong)
    expect(() => verifiedDashboardSummary(value)).toThrow(
      'Dashboard response could not be confirmed.',
    )
})
test('summary rejects invalid data without caching fake zero', async () => {
  const cache = new QueryClient(),
    client = createDashboardClient('http://localhost/api', cache, async () =>
      Response.json({}),
    )
  await expect(
    cache.fetchQuery(dashboardSummaryOptions(client, 'admin')),
  ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  expect(
    cache.getQueryData<unknown>(dashboardKeys.summary('admin')),
  ).toBeUndefined()
  cache.clear()
})
test('query scope, SSR and bounded polling policy', () => {
  const options = dashboardSummaryOptions(undefined, 'one')
  expect([...options.queryKey]).toEqual([
    'admin',
    'one',
    'dashboard',
    'summary',
  ])
  expect(options.queryKey).not.toEqual(dashboardKeys.summary('two'))
  expect(options.enabled).toBe(false)
  expect(options.retry).toBe(false)
  expect(options.staleTime).toBe(15000)
  expect(options.gcTime).toBe(300000)
  expect(dashboardPollInterval(true, true, true)).toBe(30000)
  for (const args of [
    [false, true, true],
    [true, false, true],
    [true, true, false],
  ] as const)
    expect(dashboardPollInterval(args[0], args[1], args[2])).toBe(false)
})
test('canceled late response cannot reseed departed private session', async () => {
  const cache = new QueryClient()
  let release!: () => void, started!: () => void
  const hold = new Promise<void>((r) => (release = r)),
    begin = new Promise<void>((r) => (started = r))
  let signal: AbortSignal | null | undefined
  const client = createDashboardClient(
    'http://localhost/api',
    cache,
    async (_, init) => {
      signal = init?.signal
      started()
      await hold
      return Response.json(summary())
    },
  )
  const pending = cache
    .fetchQuery(dashboardSummaryOptions(client, 'old'))
    .catch((e) => e)
  await begin
  await clearAdminPrivateQueries(cache)
  release()
  await pending
  expect(signal?.aborted).toBe(true)
  expect(
    cache.getQueryData<unknown>(dashboardKeys.summary('old')),
  ).toBeUndefined()
  cache.clear()
})
test('confirmed mutation invalidation cancels stale snapshot without hidden refetch', async () => {
  const cache = new QueryClient()
  const before = summary(),
    after = { ...summary(), generatedAt: '2026-10-08T01:00:00.000Z' }
  cache.setQueryData(dashboardKeys.summary('one'), before)
  cache.setQueryData(dashboardKeys.summary('two'), before)
  let release!: () => void,
    started!: () => void,
    reads = 0
  const hold = new Promise<void>((r) => (release = r)),
    begin = new Promise<void>((r) => (started = r))
  const client = createDashboardClient(
    'http://localhost/api',
    cache,
    async () => {
      reads++
      started()
      await hold
      return Response.json(before)
    },
  )
  const pending = cache
    .fetchQuery({ ...dashboardSummaryOptions(client, 'one'), staleTime: 0 })
    .catch((e) => e)
  await begin
  await invalidateDashboard(cache, 'one')
  cache.setQueryData(dashboardKeys.summary('one'), after)
  release()
  await pending
  expect(cache.getQueryData<unknown>(dashboardKeys.summary('one'))).toEqual(
    after,
  )
  expect(cache.getQueryState(dashboardKeys.summary('two'))?.isInvalidated).toBe(
    false,
  )
  expect(reads).toBe(1)
  cache.clear()
})

test('private dashboard gateway forwards only exact GET with cookie and no-store', async () => {
  const { createAuthGateway } = await import('../src/lib/server/auth-gateway')
  const requests: Request[] = []
  const gateway = createAuthGateway('business', {
    getPublicOrigin: () => 'http://web.example',
    getApiInternalUrl: () => 'http://127.0.0.1:43127',
    fetcher: async (request) => {
      requests.push(request)
      return Response.json(summary())
    },
  })
  const response = await gateway(
    new Request('http://web.example/api/admin/dashboard/summary', {
      headers: { cookie: 'session=private' },
    }),
  )
  expect(response.status).toBe(200)
  expect(requests[0].url).toBe('http://127.0.0.1:43127/admin/dashboard/summary')
  expect(requests[0].headers.get('cookie')).toBe('session=private')
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  for (const path of [
    '/api/admin/dashboard',
    '/api/admin/dashboard/summary/other',
    '/api/admin/dashboard/%73ummary',
  ])
    expect(
      (await gateway(new Request('http://web.example' + path))).status,
    ).toBe(404)
  expect(
    (
      await gateway(
        new Request('http://web.example/api/admin/dashboard/summary', {
          method: 'POST',
        }),
      )
    ).status,
  ).toBe(405)
  expect(requests).toHaveLength(1)
})

test('summary preserves SQL order when native timestamp precision is lost in JSON', () => {
  const value = summary()
  value.content.film = {
    total: 2,
    draft: 2,
    published: 0,
    archived: 0,
    unpublished: 0,
  }
  const rows = [1, 2].map((n) => ({
    type: 'film' as const,
    id: `00000000-0000-4000-8000-00000000000${n}`,
    title: `Film ${n}`,
    publicationStatus: 'draft' as const,
    createdAt: '2026-10-08T00:00:00.000Z',
  }))
  expect(
    verifiedDashboardSummary({ ...value, latestContent: rows }).latestContent,
  ).toEqual(rows)
})
