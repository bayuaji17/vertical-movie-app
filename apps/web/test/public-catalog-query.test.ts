import { expect, test } from 'bun:test'
import {
  QueryClient,
  InfiniteQueryObserver,
  onlineManager,
} from '@tanstack/react-query'
import {
  catalogInfiniteOptions,
  catalogQueryKey,
  createCatalogTransition,
  createCatalogDebounce,
} from '../src/lib/catalog/public-catalog-queries'
import { defaultCatalogFilters as defaults } from '../src/lib/catalog/public-catalog-model'
import type { CatalogItem } from '../src/lib/catalog/public-catalog-model'
import type {
  PublicCatalogClient,
  PublicCatalogPage,
} from '../src/lib/catalog/catalog-client'

function item(n: number): CatalogItem {
  const id = `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
  return {
    id,
    kind: 'movie',
    slug: 'film-' + n,
    title: 'Film ' + n,
    synopsis: 'Story',
    publishedAt: '2026-10-01T00:00:00.123456Z',
    genres: [],
    posterPath: `/catalog/movie/${id}/poster`,
    poster: `/api/catalog/movie/${id}/poster`,
    durationMs: 60_000,
  }
}
const api = (read: PublicCatalogClient['page']): PublicCatalogClient => ({
  page: read,
  genres: async () => ({ items: [], expiresAt: Date.now() + 60_000 }),
  featured: async () => ({ item: null, expiresAt: Date.now() + 60_000 }),
})
const page = (offset: number): PublicCatalogPage => ({
  items: Array.from({ length: 6 }, (_, i) => item(offset + i)),
  total: 18,
  nextCursor: offset < 12 ? String(offset + 6) : null,
  freshForMs: 60_000,
  expiresAt: Date.now() + 60_000,
})
test('API cursor loads 6/12/18; concurrent Load more deduplicates and EOF stops using cursor', async () => {
  const client = new QueryClient(),
    calls: Array<string | null> = []
  const options = catalogInfiniteOptions(
    defaults,
    api(async (_filters, cursor) => {
      calls.push(cursor)
      await Promise.resolve()
      return page(Number(cursor ?? 0))
    }),
  )
  await client.infiniteQuery(options)
  const observer = new InfiniteQueryObserver(client, options),
    unsub = observer.subscribe(() => {})
  await Promise.all([
    observer.fetchNextPage({ cancelRefetch: false }),
    observer.fetchNextPage({ cancelRefetch: false }),
  ])
  expect(
    observer.getCurrentResult().data!.pages.flatMap((p) => p.items),
  ).toHaveLength(12)
  await observer.fetchNextPage({ cancelRefetch: false })
  await observer.fetchNextPage({ cancelRefetch: false })
  expect(
    observer.getCurrentResult().data!.pages.flatMap((p) => p.items),
  ).toHaveLength(18)
  expect(observer.getCurrentResult().data!.pageParams).toEqual([
    null,
    '6',
    '12',
  ])
  expect(observer.getCurrentResult().hasNextPage).toBe(false)
  expect(calls).toEqual([null, '6', '12'])
  unsub()
  client.clear()
})
test('next-page failure retains cards and retries the same cursor', async () => {
  const client = new QueryClient(),
    cursors: Array<string | null> = []
  let fail = true
  const options = catalogInfiniteOptions(
    defaults,
    api(async (_f, cursor) => {
      cursors.push(cursor)
      if (cursor && fail) throw Error('503')
      return page(Number(cursor ?? 0))
    }),
  )
  await client.infiniteQuery(options)
  const observer = new InfiniteQueryObserver(client, options),
    unsub = observer.subscribe(() => {})
  await observer.fetchNextPage({ cancelRefetch: false })
  expect(observer.getCurrentResult().isFetchNextPageError).toBe(true)
  expect(observer.getCurrentResult().data!.pages).toHaveLength(1)
  fail = false
  await observer.fetchNextPage({ cancelRefetch: false })
  expect(cursors).toEqual([null, '6', '6'])
  expect(observer.getCurrentResult().data!.pages).toHaveLength(2)
  unsub()
  client.clear()
})
test('latest filter transition wins, clears only destination and canonical keys preserve admin state', async () => {
  const client = new QueryClient()
  client.setQueryData(['admin', 'sentinel'], { keep: true })
  client.setQueryData(catalogQueryKey(defaults), {
    pages: [page(0), page(6)],
    pageParams: [null, '6'],
  })
  const committed: Array<string> = [],
    change = createCatalogTransition(client, (f) => committed.push(f.kind))
  await Promise.all([
    change({ ...defaults, kind: 'movie' }),
    change({ ...defaults, kind: 'series' }),
  ])
  expect(committed).toEqual(['series'])
  await change(defaults)
  expect(client.getQueryData(catalogQueryKey(defaults))).toBeUndefined()
  expect(client.getQueryData<{ keep: boolean }>(['admin', 'sentinel'])).toEqual(
    { keep: true },
  )
  expect(catalogQueryKey({ ...defaults, search: ' Rain ' })).toEqual(
    catalogQueryKey({ ...defaults, search: 'rain' }),
  )
  client.clear()
})
test('filter cancellation aborts pending old page without converting it to a UI failure', async () => {
  const client = new QueryClient()
  let started!: () => void,
    aborted = false
  const ready = new Promise<void>((r) => (started = r))
  const options = catalogInfiniteOptions(
    defaults,
    api(async (_f, cursor, signal) => {
      if (!cursor) return page(0)
      return new Promise<PublicCatalogPage>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            aborted = true
            reject(Error('cancelled'))
          },
          { once: true },
        )
        started()
      })
    }),
  )
  await client.infiniteQuery(options)
  const observer = new InfiniteQueryObserver(client, options),
    unsub = observer.subscribe(() => {})
  const loading = observer.fetchNextPage({ cancelRefetch: false })
  await ready
  await createCatalogTransition(client, () => {})({
    ...defaults,
    kind: 'series',
  })
  await loading
  expect(aborted).toBe(true)
  expect(observer.getCurrentResult().isError).toBe(false)
  expect(observer.getCurrentResult().data!.pages).toHaveLength(1)
  unsub()
  client.clear()
})
test('search debounce flushes latest text with immediate filters and reset cancels pending timer', async () => {
  const values: Array<string> = [],
    debounce = createCatalogDebounce(async (f) => {
      values.push(f.search + ':' + f.kind)
    })
  debounce.search({ ...defaults, search: 'r' })
  debounce.search({ ...defaults, search: 'rain' })
  await debounce.immediate({ ...defaults, search: 'rain', kind: 'series' })
  await Bun.sleep(320)
  expect(values).toEqual(['rain:series'])
  debounce.search({ ...defaults, search: 'forgotten' })
  debounce.cancel()
  await Bun.sleep(320)
  expect(values).toHaveLength(1)
  debounce.search({ ...defaults, search: 'new' })
  await Bun.sleep(320)
  expect(values).toEqual(['rain:series', 'new:all'])
})
test('offline query pauses and reconnect resumes; freshness is limited to server remaining budget', async () => {
  const client = new QueryClient()
  client.mount()
  let calls = 0
  const options = catalogInfiniteOptions(
    defaults,
    api(async () => {
      calls++
      return { ...page(0), freshForMs: 1, expiresAt: Date.now() + 1 }
    }),
  )
  onlineManager.setOnline(false)
  const observer = new InfiniteQueryObserver(client, options),
    unsub = observer.subscribe(() => {})
  expect(observer.getCurrentResult().fetchStatus).toBe('paused')
  expect(calls).toBe(0)
  onlineManager.setOnline(true)
  await observer.refetch()
  expect(calls).toBe(1)
  await Bun.sleep(5)
  // Bun has no browser stale timer; reevaluate the observer against its actual deadline.
  observer.setOptions(options)
  expect(observer.getCurrentResult().isStale).toBe(true)
  unsub()
  client.unmount()
  client.clear()
  onlineManager.setOnline(true)
})
