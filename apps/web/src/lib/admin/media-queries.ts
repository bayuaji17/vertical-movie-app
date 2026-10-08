import {
  mutationOptions,
  queryOptions,
  onlineManager,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type {
  MediaClient,
  MediaOwner,
  MediaKind,
  MediaInitiate,
} from './media-client'
import { MediaApiError } from './media-errors'
import { invalidateContent } from './content-queries'
import type { ContentType } from './content-client'
import { invalidateSeries } from './series-queries'
import { inventoryNeedsPolling, sessionNeedsPolling } from './media-state'

export type MediaContext = ContentType | { type: 'episode'; seriesId: string }

export function mediaPollInterval(
  pending: boolean,
  visible = typeof document !== 'undefined' &&
    document.visibilityState === 'visible',
  online = onlineManager.isOnline(),
) {
  return pending && visible && online ? 5000 : false
}

export const mediaKeys = {
  root: (identity: string) => ['admin', identity, 'media'] as const,
  owner: (identity: string, owner: MediaOwner) =>
    [
      ...mediaKeys.root(identity),
      'owner',
      owner.ownerType,
      owner.ownerId,
    ] as const,
  session: (identity: string, owner: MediaOwner, kind: MediaKind, id: string) =>
    [...mediaKeys.owner(identity, owner), kind, id] as const,
}
function configured(client?: MediaClient) {
  if (!client)
    throw new MediaApiError(
      0,
      'CONFIG_UNAVAILABLE',
      'Media configuration is unavailable.',
    )
  return client
}
export function ownerMediaOptions(
  client: MediaClient | undefined,
  identity: string,
  owner: MediaOwner,
) {
  return queryOptions({
    queryKey: mediaKeys.owner(identity, owner),
    retry: false,
    staleTime: 0,
    gcTime: 300000,
    enabled: typeof window !== 'undefined',
    queryFn: ({ signal }) => configured(client).owner(owner, signal),
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      mediaPollInterval(inventoryNeedsPolling(query.state.data)),
  })
}
export function uploadStatusOptions(
  client: MediaClient | undefined,
  identity: string,
  owner: MediaOwner,
  kind: MediaKind,
  id: string,
) {
  return queryOptions({
    queryKey: mediaKeys.session(identity, owner, kind, id),
    retry: false,
    staleTime: 0,
    gcTime: 300000,
    enabled: typeof window !== 'undefined',
    queryFn: ({ signal }) => configured(client).status(id, signal),
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      mediaPollInterval(sessionNeedsPolling(query.state.data)),
  })
}
export function initiateMediaOptions(
  client: MediaClient | undefined,
  identity: string,
  owner: MediaOwner,
) {
  return mutationOptions({
    mutationKey: [...mediaKeys.owner(identity, owner), 'initiate'],
    retry: false,
    networkMode: 'always',
    mutationFn: (input: MediaInitiate) => configured(client).initiate(input),
  })
}
export function sessionControlOptions(
  client: MediaClient | undefined,
  identity: string,
  owner: MediaOwner,
) {
  return mutationOptions({
    mutationKey: [...mediaKeys.owner(identity, owner), 'control'],
    retry: false,
    networkMode: 'always',
    mutationFn: (command: { action: 'complete' | 'abort'; id: string }) =>
      configured(client)[command.action](command.id),
  })
}
export function posterProcessingOptions(
  client: MediaClient | undefined,
  identity: string,
  owner: MediaOwner,
) {
  return mutationOptions({
    mutationKey: [...mediaKeys.owner(identity, owner), 'prepare-poster'],
    retry: false,
    networkMode: 'always',
    mutationFn: (command: { id: string }) =>
      configured(client).processPoster(command.id),
  })
}
export async function invalidateMedia(
  cache: QueryClient,
  identity: string,
  owner: MediaOwner,
  context: MediaContext,
) {
  await Promise.all([
    cache.invalidateQueries({ queryKey: mediaKeys.owner(identity, owner) }),
    typeof context === 'string'
      ? invalidateContent(cache, identity, context, owner.ownerId)
      : invalidateSeries(cache, identity, context.seriesId, owner.ownerId),
  ])
}
