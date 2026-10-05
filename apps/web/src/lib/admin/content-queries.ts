import {
  infiniteQueryOptions,
  mutationOptions,
  queryOptions,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type {
  ContentClient,
  ContentFilters,
  ContentType,
  SeriesCreate,
  SeriesPatch,
  VideoCreate,
  VideoPatch,
} from './content-client'
import { ContentApiError } from './content-client'

export const contentKeys = {
  root: (identity: string) => ['admin', identity, 'content'] as const,
  lists: (identity: string) => [...contentKeys.root(identity), 'list'] as const,
  list: (identity: string, filters: ContentFilters) =>
    [...contentKeys.lists(identity), filters] as const,
  detail: (identity: string, type: ContentType, id: string) =>
    [...contentKeys.root(identity), 'detail', type, id] as const,
  genres: (identity: string, search: string) =>
    ['admin', identity, 'genres', search] as const,
}
function configured(client?: ContentClient): ContentClient {
  if (!client)
    throw new ContentApiError(
      0,
      'CONFIG_UNAVAILABLE',
      'API configuration is unavailable.',
    )
  return client
}
const privateRead = { retry: false as const, staleTime: 15000, gcTime: 300000 }
export function contentListOptions(
  client: ContentClient | undefined,
  identity: string,
  filters: ContentFilters,
) {
  return queryOptions({
    ...privateRead,
    queryKey: contentKeys.list(identity, filters),
    enabled: typeof window !== 'undefined',
    queryFn: ({ signal }) => configured(client).list(filters, signal),
  })
}
export function contentDetailOptions(
  client: ContentClient | undefined,
  identity: string,
  type: ContentType,
  id: string,
) {
  return queryOptions({
    ...privateRead,
    queryKey: contentKeys.detail(identity, type, id),
    enabled: typeof window !== 'undefined',
    queryFn: ({ signal }) => configured(client).detail(type, id, signal),
  })
}
export function genreOptions(
  client: ContentClient | undefined,
  identity: string,
  search: string,
) {
  return infiniteQueryOptions({
    ...privateRead,
    queryKey: contentKeys.genres(identity, search),
    enabled: typeof window !== 'undefined',
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      configured(client).genres(search, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}
export type CreateContent =
  | { type: 'series'; input: SeriesCreate }
  | { type: 'film' | 'standalone'; input: VideoCreate }
export type PatchContent =
  | { type: 'series'; id: string; input: SeriesPatch }
  | { type: 'film' | 'standalone'; id: string; input: VideoPatch }
export function createContentOptions(client: ContentClient | undefined) {
  return mutationOptions({
    retry: false,
    mutationFn: async (command: CreateContent) => {
      const api = configured(client)
      if (command.type === 'series') {
        const result = await api.createSeries(command.input)
        return { type: command.type, id: result.series.id }
      }
      const result = await api.createVideo(command.input)
      return { type: command.type, id: result.id }
    },
  })
}
export function patchContentOptions(client: ContentClient | undefined) {
  return mutationOptions({
    retry: false,
    mutationFn: async (command: PatchContent) =>
      command.type === 'series'
        ? configured(client).patchSeries(command.id, command.input)
        : configured(client).patchVideo(command.id, command.input),
  })
}
export async function invalidateContent(
  queryClient: QueryClient,
  identity: string,
  type?: ContentType,
  id?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: contentKeys.lists(identity) }),
    ...(type && id
      ? [
          queryClient.invalidateQueries({
            queryKey: contentKeys.detail(identity, type, id),
          }),
        ]
      : []),
  ])
}
