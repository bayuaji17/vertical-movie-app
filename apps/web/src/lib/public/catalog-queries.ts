import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { CatalogRequestError } from '../catalog/catalog-client'
import { readPublicVideo } from './catalog-reader'
import type { PublicVideoClient } from './catalog-client'

const metadata = { detail: readPublicVideo }
const remaining = (expiry: number, updated: number) =>
  Math.max(0, Math.min(60_000, expiry - updated))
export function videoOptions(
  slug: string,
  api: Pick<PublicVideoClient, 'detail'> = metadata,
) {
  return queryOptions({
    queryKey: ['public-catalog', 'video', 1, slug] as const,
    queryFn: ({ signal }) => api.detail(slug, signal),
    retry: false,
    networkMode: 'always',
    gcTime: 300_000,
    staleTime: (q) =>
      remaining(q.state.data?.expiresAt ?? 0, q.state.dataUpdatedAt),
  })
}
export async function loadVideo(client: QueryClient, slug: string) {
  try {
    if (typeof window !== 'undefined' && !navigator.onLine)
      return {
        status: client.getQueryData(videoOptions(slug).queryKey) ? null : 503,
      }
    await client.query(videoOptions(slug))
    return { status: null }
  } catch (error) {
    return { status: error instanceof CatalogRequestError ? error.status : 503 }
  }
}
