import { mutationOptions, queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type { ContentType } from './content-client'
import type { PublicationClient } from './publication-client'
import type { PublicationIntent } from './publication-state'
import { PublicationApiError } from './publication-errors'
import { contentKeys } from './content-queries'
import { mediaKeys } from './media-queries'

export const publicationKeys = {
  root: (identity: string) => ['admin', identity, 'publication'] as const,
  video: (identity: string, id: string) =>
    [...publicationKeys.root(identity), 'video', id] as const,
}
function configured(client?: PublicationClient) {
  if (!client)
    throw new PublicationApiError(
      0,
      'CONFIG_UNAVAILABLE',
      'Publication configuration unavailable',
    )
  return client
}
export function publicationReadinessOptions(
  client: PublicationClient | undefined,
  identity: string,
  id: string,
) {
  return queryOptions({
    queryKey: publicationKeys.video(identity, id),
    retry: false,
    staleTime: 0,
    gcTime: 300000,
    enabled: typeof window !== 'undefined',
    queryFn: ({ signal }) => configured(client).readiness(id, signal),
  })
}
export function publicationMutationOptions(
  client: PublicationClient | undefined,
  identity: string,
  id: string,
  signal?: AbortSignal,
) {
  return mutationOptions({
    mutationKey: [...publicationKeys.video(identity, id), 'command'],
    retry: false,
    networkMode: 'always',
    mutationFn: async (intent: PublicationIntent) =>
      intent.action === 'publish'
        ? configured(client).publish(
            id,
            {
              expectedVersion: intent.expectedVersion,
              idempotencyKey: intent.idempotencyKey!,
            },
            signal,
          )
        : configured(client).archive(
            id,
            { expectedVersion: intent.expectedVersion },
            signal,
          ),
  })
}
export async function invalidatePublication(
  cache: QueryClient,
  identity: string,
  type: ContentType,
  id: string,
) {
  await Promise.all(
    [
      contentKeys.lists(identity),
      contentKeys.detail(identity, type, id),
      mediaKeys.owner(identity, { ownerType: 'video', ownerId: id }),
      publicationKeys.video(identity, id),
    ].map((queryKey) =>
      cache.invalidateQueries({ queryKey, refetchType: 'none' }),
    ),
  )
}
