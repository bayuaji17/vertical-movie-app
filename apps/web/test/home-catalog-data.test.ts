import { describe, expect, test } from 'bun:test'
import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query'
import {
  catalogInfiniteOptions,
  catalogQueryKey,
  createCatalogTransition,
  firstCatalogPage,
} from '../src/lib/catalog/catalog-queries'
import { catalogData } from '../src/lib/catalog/catalog-data'
import {
  CatalogDataSchema,
  CatalogItemSchema,
} from '../src/lib/catalog/catalog-schema'
import {
  defaultCatalogFilters as defaults,
  getCatalogPage,
  selectCatalog,
  itemLength,
} from '../src/lib/catalog/catalog-selectors'

describe('local catalog fixture', () => {
  test('eighteen unique titles, six of each kind and correct initial order', () => {
    expect(catalogData.items).toHaveLength(18)
    for (const kind of ['movie', 'series', 'standalone'])
      expect(
        catalogData.items.filter((item) => item.kind === kind),
      ).toHaveLength(6)
    expect(getCatalogPage(defaults, 0).items.map((item) => item.title)).toEqual(
      [
        'After the Rain',
        'The Last Train',
        'A Small Beginning',
        'Letters to Home',
        'Midnight Kitchen',
        'City in Motion',
      ],
    )
    expect(Object.isFrozen(catalogData.items[0])).toBe(true)
  })
  test('rejects wrong kind fields, duplicate identity, unknown genres, remote posters and invalid featured item', () => {
    const film = catalogData.items[0]
    for (const invalid of [
      { ...film, episodeCount: 4 },
      { ...film, durationMs: 0 },
      { ...film, poster: 'https://example.com/photo.png' },
    ])
      expect(CatalogItemSchema.safeParse(invalid).success).toBe(false)
    for (const invalid of [
      { ...catalogData, items: [...catalogData.items, film] },
      { ...catalogData, featuredId: 'the-last-train' },
      {
        ...catalogData,
        items: [
          { ...film, genreIds: ['unknown'] },
          ...catalogData.items.slice(1),
        ],
      },
    ])
      expect(CatalogDataSchema.safeParse(invalid).success).toBe(false)
  })
  test('search title or synopsis with canonical whitespace and case; filters combine with AND', () => {
    expect(
      selectCatalog({ ...defaults, search: '  RAIN  ' }).some(
        (item) => item.id === 'after-the-rain',
      ),
    ).toBe(true)
    expect(
      selectCatalog({ ...defaults, search: 'strangers' }).map(
        (item) => item.id,
      ),
    ).toEqual(['after-the-rain'])
    expect(
      selectCatalog({ ...defaults, kind: 'series', genreId: 'comedy' }).map(
        (item) => item.id,
      ),
    ).toEqual(['midnight-kitchen', 'table-for-two'])
    expect(selectCatalog({ ...defaults, genreId: 'missing' })).toHaveLength(0)
  })
  test('stable latest order, complete pagination and empty/EOF termination', () => {
    const pages = [0, 6, 12].map((offset) => getCatalogPage(defaults, offset))
    expect(pages.map((page) => page.nextOffset)).toEqual([6, 12, undefined])
    expect(
      new Set(pages.flatMap((page) => page.items.map((item) => item.id))).size,
    ).toBe(18)
    const tied = catalogData.items.slice(-2)
    expect(
      selectCatalog(defaults, [...tied].reverse()).map((item) => item.id),
    ).toEqual(['morning-on-two-wheels', 'notes-from-the-kitchen'])
    expect(getCatalogPage(defaults, 18).nextOffset).toBeUndefined()
    expect(getCatalogPage(defaults, 0, []).total).toBe(0)
    expect(() => getCatalogPage(defaults, -1)).toThrow()
  })
  test('duration is separate from episode count', () => {
    expect(itemLength(catalogData.items[0])).toBe('18 min')
    expect(itemLength(catalogData.items[1])).toBe('8 episodes')
  })
})

describe('infinite local query', () => {
  test('offline pages load 6/12/18, repeated concurrent requests deduplicate and EOF stops', async () => {
    const client = new QueryClient()
    const observer = new InfiniteQueryObserver(
      client,
      catalogInfiniteOptions(defaults),
    )
    const unsubscribe = observer.subscribe(() => {})
    expect(
      observer.getCurrentResult().data!.pages.flatMap((page) => page.items),
    ).toHaveLength(6)
    await Promise.all([
      observer.fetchNextPage({ cancelRefetch: false }),
      observer.fetchNextPage({ cancelRefetch: false }),
    ])
    expect(
      observer.getCurrentResult().data!.pages.flatMap((page) => page.items),
    ).toHaveLength(12)
    await observer.fetchNextPage({ cancelRefetch: false })
    expect(observer.getCurrentResult().hasNextPage).toBe(false)
    expect(observer.getCurrentResult().data!.pageParams).toEqual([0, 6, 12])
    unsubscribe()
    client.clear()
  })
  test('filter changes and cache revisit reset one exact key; unrelated cache survives', async () => {
    const client = new QueryClient()
    client.setQueryData(['admin', 'sentinel'], { untouched: true })
    const observer = new InfiniteQueryObserver(
      client,
      catalogInfiniteOptions(defaults),
    )
    const unsubscribe = observer.subscribe(() => {})
    await observer.fetchNextPage()
    await observer.fetchNextPage()
    const committed: Array<string> = []
    const change = createCatalogTransition(client, (filters) =>
      committed.push(filters.kind),
    )
    await change({ ...defaults, kind: 'series' })
    await change(defaults)
    expect(
      client.getQueryData<ReturnType<typeof firstCatalogPage>>(
        catalogQueryKey(defaults),
      ),
    ).toEqual(firstCatalogPage(defaults))
    expect(
      client.getQueryData<{ untouched: boolean }>(['admin', 'sentinel']),
    ).toEqual({
      untouched: true,
    })
    await Promise.all([
      change({ ...defaults, kind: 'movie' }),
      change({ ...defaults, kind: 'standalone' }),
    ])
    expect(committed).toEqual(['series', 'all', 'standalone'])
    expect(catalogQueryKey({ ...defaults, search: '  Rain  ' })).toEqual(
      catalogQueryKey({ ...defaults, search: 'rain' }),
    )
    unsubscribe()
    client.clear()
  })
  test('cancellation aborts a pending old page and a newer selection wins', async () => {
    const client = new QueryClient()
    let aborted = false
    const options = catalogInfiniteOptions(defaults)
    const observer = new InfiniteQueryObserver(client, {
      ...options,
      queryFn: ({ signal }) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              aborted = true
              reject(new Error('cancelled'))
            },
            { once: true },
          )
        }),
    })
    const unsubscribe = observer.subscribe(() => {})
    const loading = observer.fetchNextPage({ cancelRefetch: false })
    let committed = defaults
    const change = createCatalogTransition(client, (filters) => {
      committed = filters
    })
    await change({ ...defaults, kind: 'movie' })
    await loading
    expect(aborted).toBe(true)
    expect(committed.kind).toBe('movie')
    expect(observer.getCurrentResult().data).toEqual(firstCatalogPage(defaults))
    unsubscribe()
    client.clear()
  })
})
