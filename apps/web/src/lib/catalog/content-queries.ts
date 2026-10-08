import { createIsomorphicFn } from '@tanstack/react-start'
import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { createPublicContentClient } from './content-client'
import type { PublicContentClient } from './content-client'
import type { ContentKind, WatchVideo } from './content-model'
import {
  detailOnServer,
  episodesOnServer,
  watchOnServer,
  setContentStatusOnServer,
} from './content.server'
import { CatalogRequestError } from './catalog-client'

export const publicContentBrowser = () =>
  createPublicContentClient(location.origin + '/api')
const detail = createIsomorphicFn()
  .server(detailOnServer)
  .client((kind: ContentKind, slug: string, signal: AbortSignal) =>
    publicContentBrowser().detail(kind, slug, signal),
  )
const episodes = createIsomorphicFn()
  .server(episodesOnServer)
  .client((slug: string, cursor: string | null, signal: AbortSignal) =>
    publicContentBrowser().episodes(slug, cursor, signal),
  )
const watch = createIsomorphicFn()
  .server(watchOnServer)
  .client((slug: string, signal: AbortSignal) =>
    publicContentBrowser().watch(slug, signal),
  )
const transport = { detail, episodes, watch }
const nextReader = createIsomorphicFn()
  .server((_slug: string, _signal: AbortSignal) =>
    Promise.resolve<WatchVideo | null>(null),
  )
  .client((slug: string, signal: AbortSignal) =>
    publicContentBrowser().next(slug, signal),
  )
export const setContentHttpStatus = createIsomorphicFn()
  .server(setContentStatusOnServer)
  .client((_status: number | null) => undefined)
const remaining = (expiresAt: number, updatedAt: number) =>
  Math.max(0, Math.min(60_000, expiresAt - updatedAt))
export function contentDetailOptions(
  kind: ContentKind,
  slug: string,
  api: Pick<PublicContentClient, 'detail'> = transport,
) {
  return queryOptions({
    queryKey: [
      'catalog',
      'public',
      'content',
      'detail',
      1,
      kind,
      slug,
    ] as const,
    queryFn: ({ signal }) => api.detail(kind, slug, signal),
    retry: false,
    staleTime: (q) =>
      remaining(q.state.data?.expiresAt ?? 0, q.state.dataUpdatedAt),
  })
}
export function contentEpisodesOptions(
  slug: string,
  api: Pick<PublicContentClient, 'episodes'> = transport,
) {
  return infiniteQueryOptions({
    queryKey: ['catalog', 'public', 'content', 'episodes', 1, slug] as const,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => api.episodes(slug, pageParam, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
    staleTime: (q) =>
      remaining(
        Math.min(...(q.state.data?.pages.map((p) => p.expiresAt) ?? [0])),
        q.state.dataUpdatedAt,
      ),
  })
}
export function watchMetadataOptions(
  slug: string,
  api: Pick<PublicContentClient, 'watch'> = transport,
) {
  return queryOptions({
    queryKey: ['catalog', 'public', 'content', 'watch', 1, slug] as const,
    queryFn: ({ signal }) => api.watch(slug, signal),
    retry: false,
    networkMode: 'always',
    staleTime: (q) =>
      remaining(q.state.data?.expiresAt ?? 0, q.state.dataUpdatedAt),
  })
}
export function nextEpisodeOptions(
  slug: string,
  seriesSlug: string,
  seasonNumber: number,
  episodeNumber: number,
  api: Pick<PublicContentClient, 'next'> = { next: nextReader },
) {
  return queryOptions({
    queryKey: ['catalog', 'public', 'content', 'next', 1, slug] as const,
    queryFn: async ({ signal }) => {
      const next = await api.next(slug, signal)
      if (
        next &&
        (next.seriesSlug !== seriesSlug ||
          next.seasonNumber === null ||
          next.episodeNumber === null ||
          next.seasonNumber < seasonNumber ||
          (next.seasonNumber === seasonNumber &&
            next.episodeNumber <= episodeNumber))
      )
        throw new CatalogRequestError(502)
      return next
    },
    retry: false,
    staleTime: 0,
  })
}
export type ContentBootstrap = {
  detailStatus: number | null
  episodesStatus: number | null
}
const status = (result: PromiseSettledResult<unknown>) =>
  result.status === 'rejected'
    ? result.reason instanceof CatalogRequestError
      ? result.reason.status
      : 503
    : null
export async function loadContent(
  client: QueryClient,
  kind: ContentKind,
  slug: string,
): Promise<ContentBootstrap> {
  const results = await Promise.allSettled([
    client.query(contentDetailOptions(kind, slug)),
    kind === 'series'
      ? client.infiniteQuery(contentEpisodesOptions(slug))
      : Promise.resolve(null),
  ])
  setContentHttpStatus(status(results[0]))
  return {
    detailStatus: status(results[0]),
    episodesStatus: status(results[1]),
  }
}
export async function loadWatchMetadata(client: QueryClient, slug: string) {
  if (typeof window !== 'undefined' && !navigator.onLine)
    return {
      status: client.getQueryData(watchMetadataOptions(slug).queryKey)
        ? null
        : 503,
    }
  const [result] = await Promise.allSettled([
    client.query(watchMetadataOptions(slug)),
  ])
  setContentHttpStatus(status(result))
  return { status: status(result) }
}
