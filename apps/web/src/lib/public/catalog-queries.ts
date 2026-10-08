import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { CatalogRequestError } from '../catalog/catalog-client'
import { readPublicVideo, readPublicVideos } from './catalog-reader'
import { catalogPageSize, catalogType } from './catalog-model'
import type { CatalogType } from './catalog-model'
import type { PublicVideoClient, PublicVideoPage } from './catalog-client'

export const catalogKey = (type: CatalogType) =>
  [
    'public-catalog',
    1,
    {
      type: catalogType(type),
      limit: catalogPageSize,
      sort: 'createdAt-desc_id-desc',
    },
  ] as const
const metadata = { page: readPublicVideos, detail: readPublicVideo }
const remaining = (expiry: number, updated: number) =>
  Math.max(0, Math.min(60_000, expiry - updated))
export function catalogOptions(
  type: CatalogType,
  api: Pick<PublicVideoClient, 'page'> = metadata,
) {
  return infiniteQueryOptions({
    queryKey: catalogKey(type),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.page(catalogType(type), pageParam, signal)
      if (pageParam && result.nextCursor === pageParam)
        throw new CatalogRequestError(502)
      return result
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
    gcTime: 300_000,
    staleTime: (q) =>
      remaining(
        Math.min(...(q.state.data?.pages.map((p) => p.expiresAt) ?? [0])),
        q.state.dataUpdatedAt,
      ),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
export function videoOptions(
  slug: string,
  api: Pick<PublicVideoClient, 'detail'> = metadata,
) {
  return queryOptions({
    queryKey: ['public-catalog', 'video', 1, slug] as const,
    queryFn: ({ signal }) => api.detail(slug, signal),
    retry: false,
    gcTime: 300_000,
    staleTime: (q) =>
      remaining(q.state.data?.expiresAt ?? 0, q.state.dataUpdatedAt),
  })
}
export function catalogItems(pages: PublicVideoPage[] = []) {
  return [
    ...new Map(pages.flatMap((p) => p.items).map((v) => [v.id, v])).values(),
  ]
}
export async function restartCatalog(
  client: QueryClient,
  type: CatalogType,
  api: Pick<PublicVideoClient, 'page'> = metadata,
) {
  const key = catalogKey(type)
  await client.cancelQueries({ queryKey: key, exact: true })
  await client.resetQueries({ queryKey: key, exact: true })
  return client.infiniteQuery(catalogOptions(type, api))
}
export async function loadCatalog(client: QueryClient, type: CatalogType) {
  try {
    const cached = client.getQueryData<InfiniteData<PublicVideoPage>>(
      catalogKey(type),
    )
    if (cached && cached.pages.some((p) => p.expiresAt <= Date.now()))
      await restartCatalog(client, type)
    else await client.infiniteQuery(catalogOptions(type))
    return { status: null }
  } catch (error) {
    return { status: error instanceof CatalogRequestError ? error.status : 503 }
  }
}
export async function loadVideo(client: QueryClient, slug: string) {
  try {
    await client.query(videoOptions(slug))
    return { status: null }
  } catch (error) {
    return { status: error instanceof CatalogRequestError ? error.status : 503 }
  }
}
