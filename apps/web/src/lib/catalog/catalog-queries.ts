import { infiniteQueryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { catalogData } from './catalog-data'
import {
  catalogPageSize,
  defaultCatalogFilters,
  getCatalogPage,
  normalizeFilters,
  sameFilters,
} from './catalog-selectors'
import type { CatalogFilters } from './catalog-selectors'

export function catalogQueryKey(filters: CatalogFilters) {
  return [
    'catalog',
    'dummy',
    catalogData.schemaVersion,
    { ...normalizeFilters(filters), pageSize: catalogPageSize },
  ] as const
}
export function firstCatalogPage(filters: CatalogFilters) {
  return { pages: [getCatalogPage(filters, 0)], pageParams: [0] }
}
export function catalogInfiniteOptions(filters: CatalogFilters) {
  const normalized = normalizeFilters(filters)
  return infiniteQueryOptions({
    queryKey: catalogQueryKey(normalized),
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      signal.throwIfAborted()
      const page = getCatalogPage(normalized, pageParam)
      await Promise.resolve()
      signal.throwIfAborted()
      return page
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialData: () => firstCatalogPage(normalized),
    staleTime: Infinity,
    networkMode: 'always',
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
// Cancel and seed only exact catalog keys. The latest requested filters win
// even when a user changes controls again before cancellation settles.
export function createCatalogTransition(
  client: QueryClient,
  commit: (filters: CatalogFilters) => void,
) {
  let current = defaultCatalogFilters
  let requested = current
  let revision = 0
  return async (next: CatalogFilters, force = false) => {
    const normalized = normalizeFilters(next)
    if (!force && sameFilters(requested, normalized)) return
    requested = normalized
    const request = ++revision
    await client.cancelQueries({
      queryKey: catalogQueryKey(current),
      exact: true,
    })
    if (request !== revision) return
    await client.cancelQueries({
      queryKey: catalogQueryKey(normalized),
      exact: true,
    })
    if (request !== revision) return
    client.setQueryData(
      catalogQueryKey(normalized),
      firstCatalogPage(normalized),
    )
    current = normalized
    commit(normalized)
  }
}
