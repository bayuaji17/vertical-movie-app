import {
  infiniteQueryOptions,
  mutationOptions,
  queryOptions,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type {
  EpisodeCreate,
  EpisodeFilters,
  EpisodePatch,
  SeasonCreate,
  SeasonPatch,
  SeriesClient,
} from './series-client'
import { ContentApiError } from './content-client'
import { contentKeys } from './content-queries'
import { publicationKeys } from './publication-queries'

export const seriesKeys = {
  root: (identity: string) => ['admin', identity, 'series-editor'] as const,
  owner: (identity: string, seriesId: string) =>
    [...seriesKeys.root(identity), seriesId] as const,
  seasons: (identity: string, seriesId: string, includeArchived: boolean) =>
    [
      ...seriesKeys.owner(identity, seriesId),
      'seasons',
      includeArchived,
    ] as const,
  episodes: (identity: string, filters: EpisodeFilters) =>
    [
      ...seriesKeys.owner(identity, filters.seriesId),
      'episodes',
      filters,
    ] as const,
  episode: (identity: string, seriesId: string, id: string) =>
    [...seriesKeys.owner(identity, seriesId), 'episode', id] as const,
}
function configured(client?: SeriesClient) {
  if (!client)
    throw new ContentApiError(
      0,
      'CONFIG_UNAVAILABLE',
      'API configuration is unavailable.',
    )
  return client
}
const privateRead = {
  retry: false as const,
  staleTime: 15000,
  gcTime: 300000,
  enabled: typeof window !== 'undefined',
}
export function seasonListOptions(
  client: SeriesClient | undefined,
  identity: string,
  seriesId: string,
  includeArchived = false,
) {
  return queryOptions({
    ...privateRead,
    queryKey: seriesKeys.seasons(identity, seriesId, includeArchived),
    queryFn: ({ signal }) =>
      configured(client).seasons(seriesId, includeArchived, signal),
  })
}
export function episodeListOptions(
  client: SeriesClient | undefined,
  identity: string,
  filters: EpisodeFilters,
) {
  return infiniteQueryOptions({
    ...privateRead,
    queryKey: seriesKeys.episodes(identity, filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      configured(client).episodes(filters, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}
export function episodeDetailOptions(
  client: SeriesClient | undefined,
  identity: string,
  seriesId: string,
  id: string,
) {
  return queryOptions({
    ...privateRead,
    queryKey: seriesKeys.episode(identity, seriesId, id),
    queryFn: ({ signal }) => configured(client).episode(seriesId, id, signal),
  })
}
export type SeriesCommand =
  | { action: 'create-season'; input: SeasonCreate }
  | { action: 'patch-season'; id: string; input: SeasonPatch }
  | { action: 'create-episode'; input: EpisodeCreate }
  | { action: 'patch-episode'; id: string; input: EpisodePatch }
export function seriesMutationOptions(
  client: SeriesClient | undefined,
  identity: string,
  seriesId: string,
  signal?: AbortSignal | (() => AbortSignal),
) {
  return mutationOptions({
    mutationKey: [...seriesKeys.owner(identity, seriesId), 'command'],
    retry: false,
    networkMode: 'always',
    mutationFn: async (command: SeriesCommand) => {
      const api = configured(client)
      const currentSignal = typeof signal === 'function' ? signal() : signal
      switch (command.action) {
        case 'create-season':
          return api.createSeason(seriesId, command.input, currentSignal)
        case 'patch-season':
          return api.patchSeason(
            seriesId,
            command.id,
            command.input,
            currentSignal,
          )
        case 'create-episode':
          return api.createEpisode(command.input, currentSignal)
        case 'patch-episode':
          return api.patchEpisode(command.id, command.input, currentSignal)
      }
    },
  })
}
// Called explicitly after the owner/session controller confirms the result is
// still relevant. No automatic success callback can reseed a departed session.
export async function invalidateSeries(
  cache: QueryClient,
  identity: string,
  seriesId: string,
  episodeId?: string,
) {
  const keys: ReadonlyArray<readonly unknown[]> = [
    seriesKeys.owner(identity, seriesId),
    contentKeys.lists(identity),
    contentKeys.detail(identity, 'series', seriesId),
    ...(episodeId ? [publicationKeys.video(identity, episodeId)] : []),
  ]
  await Promise.all(
    keys.map((queryKey) =>
      cache.invalidateQueries({ queryKey, refetchType: 'none' }),
    ),
  )
}
