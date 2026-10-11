import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  catalogInfiniteOptions,
  catalogItems,
  catalogQueryKey,
  restartBrowseCatalog,
} from '#/lib/catalog/public-catalog-queries'
import { browseFilters } from '#/lib/public/catalog-model'
import type { CatalogType } from '#/lib/public/catalog-model'
import type { PublicCatalogPage } from '#/lib/catalog/catalog-client'
import type { InfiniteData } from '@tanstack/react-query'
import { usePublicOnline } from './use-public-online'

export function usePublicCatalog(
  type: CatalogType,
  q: string,
  status: number | null,
) {
  const filters = useMemo(() => browseFilters(type, q), [type, q])
  const client = useQueryClient(),
    online = usePublicOnline(),
    loadingMore = useRef(false),
    refreshing = useRef(false),
    wasOnline = useRef(true),
    key = catalogQueryKey(filters)
  const query = useInfiniteQuery({
    ...catalogInfiniteOptions(filters),
    // The route loader and explicit refresh own freshness; returning from a
    // detail page must not refetch or move already loaded pages.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: online && (!status || !!client.getQueryData(key)),
  })
  const refresh = useCallback(async () => {
    if (!online || refreshing.current) return
    refreshing.current = true
    try {
      await restartBrowseCatalog(client, filters)
    } catch {
      /* Query state owns the public error. */
    } finally {
      refreshing.current = false
    }
  }, [online, client, filters])
  useEffect(() => {
    const check = () => {
      const data = client.getQueryData<InfiniteData<PublicCatalogPage>>(
        catalogQueryKey(filters),
      )
      if (
        navigator.onLine &&
        data?.pages.some((p) => p.expiresAt <= Date.now())
      )
        void refresh()
    }
    window.addEventListener('focus', check)
    return () => {
      window.removeEventListener('focus', check)
      void client.cancelQueries({
        queryKey: catalogQueryKey(filters),
        exact: true,
      })
    }
  }, [client, filters, refresh])
  useEffect(() => {
    if (online && !wasOnline.current) void refresh()
    wasOnline.current = online
  }, [online, refresh])
  const more = async () => {
    if (
      !online ||
      loadingMore.current ||
      query.isFetching ||
      !query.hasNextPage
    )
      return
    loadingMore.current = true
    try {
      await query.fetchNextPage({ cancelRefetch: false })
    } finally {
      loadingMore.current = false
    }
  }
  return {
    query,
    items: catalogItems(query.data?.pages),
    total: query.data?.pages.at(-1)?.total ?? 0,
    online,
    refresh,
    more,
    client,
  }
}
