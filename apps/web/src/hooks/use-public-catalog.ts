import { useCallback, useEffect, useRef } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  catalogItems,
  catalogKey,
  catalogOptions,
  restartCatalog,
} from '#/lib/public/catalog-queries'
import type { CatalogType } from '#/lib/public/catalog-model'
import type { PublicVideoPage } from '#/lib/public/catalog-client'
import type { InfiniteData } from '@tanstack/react-query'
import { usePublicOnline } from './use-public-online'

export function usePublicCatalog(type: CatalogType, status: number | null) {
  const client = useQueryClient(),
    online = usePublicOnline(),
    loadingMore = useRef(false),
    refreshing = useRef(false),
    wasOnline = useRef(true)
  const query = useInfiniteQuery({
    ...catalogOptions(type),
    enabled: online && (!status || !!client.getQueryData(catalogKey(type))),
  })
  const refresh = useCallback(async () => {
    if (!online || refreshing.current) return
    refreshing.current = true
    try {
      await restartCatalog(client, type)
    } catch {
      /* Query state owns the public error. */
    } finally {
      refreshing.current = false
    }
  }, [online, client, type])
  useEffect(() => {
    const check = () => {
      const data = client.getQueryData<InfiniteData<PublicVideoPage>>(
        catalogKey(type),
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
      void client.cancelQueries({ queryKey: catalogKey(type), exact: true })
    }
  }, [client, type, refresh])
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
    online,
    refresh,
    more,
    client,
  }
}
