import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  catalogItems,
  catalogQueryKey,
  loadBrowseCatalog,
} from '../src/lib/catalog/public-catalog-queries'
import { CatalogRequestError } from '../src/lib/catalog/catalog-client'
import { browseFilters } from '../src/lib/public/catalog-model'
import type { CatalogItem } from '../src/lib/catalog/public-catalog-model'
import type {
  PublicCatalogClient,
  PublicCatalogPage,
} from '../src/lib/catalog/catalog-client'

function item(n: number, kind: CatalogItem['kind'] = 'movie'): CatalogItem {
  const id = `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
  const common = {
    id,
    slug: 'title-' + n,
    title: 'Title ' + n,
    synopsis: 'Story',
    publishedAt: '2026-10-01T00:00:00.123456Z',
    genres: [],
    posterPath: `/catalog/${kind}/${id}/poster`,
    poster: `/api/catalog/${kind}/${id}/poster`,
  }
  return kind === 'series'
    ? { ...common, kind, episodeCount: 3 }
    : { ...common, kind, durationMs: 60_000 }
}
const page = (items: CatalogItem[], expiresAt = Date.now() + 60_000) =>
  ({
    items,
    total: items.length,
    nextCursor: null,
    freshForMs: 60_000,
    expiresAt,
  }) satisfies PublicCatalogPage
const api = (read: PublicCatalogClient['page']): PublicCatalogClient => ({
  page: read,
  genres: async () => ({ items: [], expiresAt: Date.now() + 60_000 }),
  featured: async () => ({ item: null, expiresAt: Date.now() + 60_000 }),
})

test('loader sends the search and API kind, and filters never share a cache entry', async () => {
  const client = new QueryClient(),
    seen: Array<{ search: string; kind: string }> = []
  const read = api(async (filters) => {
    seen.push({ search: filters.search, kind: filters.kind })
    return page([item(1)])
  })
  const all = browseFilters('all', ''),
    film = browseFilters('film', ' Night '),
    series = browseFilters('series', 'night')
  for (const filters of [all, film, series])
    expect(await loadBrowseCatalog(client, filters, read)).toEqual({
      status: null,
    })
  expect(seen).toEqual([
    { search: '', kind: 'all' },
    { search: 'Night', kind: 'movie' },
    { search: 'night', kind: 'series' },
  ])
  expect(
    new Set([all, film, series].map((f) => JSON.stringify(catalogQueryKey(f))))
      .size,
  ).toBe(3)
  // Same normalized query hits the cache instead of the API.
  await loadBrowseCatalog(client, browseFilters('film', 'NIGHT'), read)
  expect(seen).toHaveLength(3)
  client.clear()
})
test('loader maps failures to a status and never caches an empty page', async () => {
  const client = new QueryClient()
  const filters = browseFilters('all', 'zzz')
  expect(
    await loadBrowseCatalog(
      client,
      filters,
      api(async () => {
        throw new CatalogRequestError(503)
      }),
    ),
  ).toEqual({ status: 503 })
  expect(
    await loadBrowseCatalog(
      client,
      filters,
      api(async () => {
        throw new Error('network')
      }),
    ),
  ).toEqual({ status: 503 })
  expect(
    await loadBrowseCatalog(
      client,
      filters,
      api(async () => {
        throw new CatalogRequestError(422)
      }),
    ),
  ).toEqual({ status: 422 })
  expect(client.getQueryData(catalogQueryKey(filters))).toBeUndefined()
  client.clear()
})
test('expired cached pages restart from page one instead of reusing the cursor', async () => {
  const client = new QueryClient(),
    cursors: Array<string | null> = []
  const filters = browseFilters('all', '')
  const read = api(async (_filters, cursor) => {
    cursors.push(cursor)
    return page(
      [item(cursors.length)],
      cursors.length === 1 ? 1 : Date.now() + 60_000,
    )
  })
  await loadBrowseCatalog(client, filters, read)
  await Bun.sleep(5)
  await loadBrowseCatalog(client, filters, read)
  expect(cursors).toEqual([null, null])
  client.clear()
})
test('catalogItems dedupes by kind and id so a Series and Film with the same id both show', () => {
  const film = item(7),
    series = { ...item(7, 'series') }
  const merged = catalogItems([page([film, series]), page([film])])
  expect(merged.map((i) => i.kind)).toEqual(['movie', 'series'])
})
