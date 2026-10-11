import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { CatalogRequestError } from '../catalog/catalog-client'
import { readPublicVideo } from './catalog-reader'
import { contentDetailOptions } from '../catalog/content-queries'
import type { PublicContentClient } from '../catalog/content-client'
import type { PublicVideoClient } from './catalog-client'
import type { PublicVideo } from './catalog-model'

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
export async function loadVideo(
  client: QueryClient,
  slug: string,
  api: Pick<PublicVideoClient, 'detail'> = metadata,
) {
  try {
    if (typeof window !== 'undefined' && !navigator.onLine)
      return {
        status: client.getQueryData(videoOptions(slug, api).queryKey)
          ? null
          : 503,
      }
    await client.query(videoOptions(slug, api))
    return { status: null }
  } catch (error) {
    return { status: error instanceof CatalogRequestError ? error.status : 503 }
  }
}
/** Detail loader: the video decides the page status; genres are optional extras. */
export async function loadVideoDetail(
  client: QueryClient,
  slug: string,
  apis: {
    video?: Pick<PublicVideoClient, 'detail'>
    content?: Pick<PublicContentClient, 'detail'>
  } = {},
) {
  const result = await loadVideo(client, slug, apis.video)
  if (result.status || (typeof window !== 'undefined' && !navigator.onLine))
    return result
  const video = client.getQueryData<{ item: PublicVideo }>(
    videoOptions(slug, apis.video).queryKey,
  )?.item
  if (video && video.kind !== 'episode')
    try {
      await client.query(contentDetailOptions(video.kind, slug, apis.content))
    } catch {
      /* Genres are display-only; the page works without them. */
    }
  return result
}
