import { createApiClient } from '../api/client'
import type { ApiFetcher } from '../api/client'
import {
  publicPageSchema,
  publicGenresSchema,
  publicFeaturedSchema,
  publicItem,
  normalizeFilters,
  catalogPageSize,
} from './public-catalog-model'
import type { CatalogFilters, PublicGenre } from './public-catalog-model'

export class CatalogRequestError extends Error {
  constructor(public readonly status: number) {
    super('Catalog is temporarily unavailable.')
    this.name = 'CatalogRequestError'
  }
}
export function createPublicCatalogClient(
  baseUrl: string,
  fetcher: ApiFetcher = fetch,
  now = () => Date.now(),
) {
  const client = createApiClient(baseUrl, (input, init) =>
    fetcher(input, {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    }),
  )
  async function page(
    filters: CatalogFilters,
    cursor: string | null,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted()
    const q = normalizeFilters(filters)
    const r = await client.catalog.get({
      query: {
        limit: String(catalogPageSize),
        ...(cursor ? { cursor } : {}),
        ...(q.search ? { search: q.search } : {}),
        ...(q.kind !== 'all' ? { kind: q.kind } : {}),
        ...(q.genreId !== 'all' ? { genreId: q.genreId } : {}),
      },
      fetch: { signal },
    })
    signal.throwIfAborted()
    if (r.error) throw new CatalogRequestError(r.status)
    const parsed = publicPageSchema.safeParse(r.data)
    if (!parsed.success) throw new CatalogRequestError(502)
    return {
      ...parsed.data,
      items: parsed.data.items.map(publicItem),
      expiresAt: now() + parsed.data.freshForMs,
    }
  }
  async function genres(signal: AbortSignal) {
    let cursor: string | null = null,
      expiresAt = Infinity
    const cursors = new Set<string>(),
      items = new Map<string, PublicGenre>()
    do {
      signal.throwIfAborted()
      const r = await client.catalog.genres.get({
        query: { limit: '100', ...(cursor ? { cursor } : {}) },
        fetch: { signal },
      })
      signal.throwIfAborted()
      if (r.error) throw new CatalogRequestError(r.status)
      const parsed = publicGenresSchema.safeParse(r.data)
      if (!parsed.success) throw new CatalogRequestError(502)
      expiresAt = Math.min(expiresAt, now() + parsed.data.freshForMs)
      for (const item of parsed.data.items) items.set(item.id, item)
      cursor = parsed.data.nextCursor
      if (cursor) {
        if (cursors.has(cursor)) throw new CatalogRequestError(502)
        cursors.add(cursor)
      }
    } while (cursor)
    return { items: [...items.values()], expiresAt }
  }
  async function featured(signal: AbortSignal) {
    signal.throwIfAborted()
    const r = await client.catalog.featured.get({ fetch: { signal } })
    signal.throwIfAborted()
    if (r.error) throw new CatalogRequestError(r.status)
    const parsed = publicFeaturedSchema.safeParse(r.data)
    if (!parsed.success) throw new CatalogRequestError(502)
    return {
      item: parsed.data.item ? publicItem(parsed.data.item) : null,
      expiresAt: now() + parsed.data.freshForMs,
    }
  }
  return { page, genres, featured }
}
export type PublicCatalogClient = ReturnType<typeof createPublicCatalogClient>
export type PublicCatalogPage = Awaited<ReturnType<PublicCatalogClient['page']>>
