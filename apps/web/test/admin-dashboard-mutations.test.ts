import { expect, test } from 'bun:test'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { createDashboardClient } from '../src/lib/admin/dashboard-client'
import {
  dashboardKeys,
  dashboardSummaryOptions,
} from '../src/lib/admin/dashboard-queries'
import { invalidateContent } from '../src/lib/admin/content-queries'
import { invalidateSeries } from '../src/lib/admin/series-queries'
import { invalidateMedia } from '../src/lib/admin/media-queries'
import { invalidatePublication } from '../src/lib/admin/publication-queries'
import { invalidateOwnerPublication } from '../src/lib/admin/owner-publication-queries'

const id = '00000000-0000-4000-8000-000000000001',
  parent = '00000000-0000-4000-8000-000000000002'
const zero = () => ({
  total: 0,
  draft: 0,
  published: 0,
  archived: 0,
  unpublished: 0,
})
const data = () => ({
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
const actions = [
  [
    'metadata',
    (cache: QueryClient) => invalidateContent(cache, 'one', 'film', id),
  ],
  [
    'season/episode',
    (cache: QueryClient) => invalidateSeries(cache, 'one', parent, id),
  ],
  [
    'source/cover',
    (cache: QueryClient) =>
      invalidateMedia(
        cache,
        'one',
        { ownerType: 'video', ownerId: id },
        'film',
      ),
  ],
  [
    'Film publication',
    (cache: QueryClient) => invalidatePublication(cache, 'one', 'film', id),
  ],
  [
    'Episode publication',
    (cache: QueryClient) =>
      invalidateOwnerPublication(cache, 'one', {
        type: 'episode',
        id,
        seriesId: parent,
      }),
  ],
] as const
for (const [name, action] of actions)
  test(`${name} invalidates only matching dashboard without fetching`, async () => {
    const cache = new QueryClient()
    let reads = 0
    const client = createDashboardClient(
      'http://localhost/api',
      cache,
      async () => {
        reads++
        return Response.json(data())
      },
    )
    cache.setQueryData(dashboardKeys.summary('one'), data())
    cache.setQueryData(dashboardKeys.summary('two'), data())
    const observer = new QueryObserver(cache, {
      ...dashboardSummaryOptions(client, 'one'),
      enabled: true,
    })
    const unsubscribe = observer.subscribe(() => {})
    await action(cache)
    expect(
      cache.getQueryState(dashboardKeys.summary('one'))?.isInvalidated,
    ).toBe(true)
    expect(
      cache.getQueryState(dashboardKeys.summary('two'))?.isInvalidated,
    ).toBe(false)
    expect(reads).toBe(0)
    unsubscribe()
    observer.destroy()
    cache.clear()
  })
