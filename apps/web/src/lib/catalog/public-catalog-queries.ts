import { createIsomorphicFn } from '@tanstack/react-start'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { createPublicCatalogClient } from './catalog-client'
import type { PublicCatalogClient } from './catalog-client'
import {
  readCatalogPageOnServer,
  readCatalogGenresOnServer,
  readCatalogFeaturedOnServer,
} from './catalog.server'
import {
  normalizeFilters,
  catalogPageSize,
  catalogSort,
  defaultCatalogFilters,
} from './public-catalog-model'
import type { CatalogFilters } from './public-catalog-model'

const browserClient = () => createPublicCatalogClient(location.origin + '/api')
const page = createIsomorphicFn()
  .server(readCatalogPageOnServer)
  .client(
    (filters: CatalogFilters, cursor: string | null, signal: AbortSignal) =>
      browserClient().page(filters, cursor, signal),
  )
const genres = createIsomorphicFn()
  .server(readCatalogGenresOnServer)
  .client((signal: AbortSignal) => browserClient().genres(signal))
const featured = createIsomorphicFn()
  .server(readCatalogFeaturedOnServer)
  .client((signal: AbortSignal) => browserClient().featured(signal))
const transport: PublicCatalogClient = { page, genres, featured }
export function catalogQueryKey(filters: CatalogFilters) {
  return [
    'catalog',
    'public',
    1,
    { ...normalizeFilters(filters), limit: catalogPageSize, sort: catalogSort },
  ] as const
}
export function catalogInfiniteOptions(
  filters: CatalogFilters,
  client: PublicCatalogClient = transport,
) {
  return infiniteQueryOptions({
    queryKey: catalogQueryKey(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => client.page(filters, pageParam, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
    networkMode: 'online',
    staleTime: (query) =>
      Math.max(
        0,
        Math.min(
          60_000,
          ...(query.state.data?.pages.map(
            (p) => p.expiresAt - query.state.dataUpdatedAt,
          ) ?? [0]),
        ),
      ),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
export function catalogGenresOptions(client: PublicCatalogClient = transport) {
  return queryOptions({
    queryKey: ['catalog', 'public', 'genres', 1] as const,
    queryFn: ({ signal }) => client.genres(signal),
    retry: false,
    staleTime: (query) =>
      Math.max(
        0,
        Math.min(
          60_000,
          (query.state.data?.expiresAt ?? 0) - query.state.dataUpdatedAt,
        ),
      ),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
export function catalogFeaturedOptions(
  client: PublicCatalogClient = transport,
) {
  return queryOptions({
    queryKey: ['catalog', 'public', 'featured', 1] as const,
    queryFn: ({ signal }) => client.featured(signal),
    retry: false,
    staleTime: (query) =>
      Math.max(
        0,
        Math.min(
          60_000,
          (query.state.data?.expiresAt ?? 0) - query.state.dataUpdatedAt,
        ),
      ),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
export type CatalogBootstrap = {
  catalogFailed: boolean
  genresFailed: boolean
  featuredFailed: boolean
}
export async function loadPublicCatalog(
  client: QueryClient,
  api: PublicCatalogClient = transport,
): Promise<CatalogBootstrap> {
  const results = await Promise.allSettled([
    client.infiniteQuery(catalogInfiniteOptions(defaultCatalogFilters, api)),
    client.query(catalogGenresOptions(api)),
    client.query(catalogFeaturedOptions(api)),
  ])
  return {
    catalogFailed: results[0].status === 'rejected',
    genresFailed: results[1].status === 'rejected',
    featuredFailed: results[2].status === 'rejected',
  }
}
