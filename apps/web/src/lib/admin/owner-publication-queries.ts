import { mutationOptions, queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type {
  PublicationClient,
  PublicationReadiness,
  SeriesPublicationReadiness,
} from './publication-client'
import type { PublicationIntent } from './publication-state'
import { PublicationApiError } from './publication-errors'
import { publicationKeys } from './publication-queries'
import { contentKeys } from './content-queries'
import { seriesKeys } from './series-queries'
import { mediaKeys } from './media-queries'

export type PublicationTarget =
  | { type: 'series'; id: string }
  | { type: 'episode'; id: string; seriesId: string }
export const ownerPublicationKey = (
  identity: string,
  target: PublicationTarget,
) =>
  target.type === 'series'
    ? publicationKeys.series(identity, target.id)
    : publicationKeys.video(identity, target.id)
export function ownerReadinessOptions(
  client: PublicationClient | undefined,
  identity: string,
  target: PublicationTarget,
) {
  const read = async (
    signal: AbortSignal,
  ): Promise<PublicationReadiness | SeriesPublicationReadiness> => {
    if (!client)
      throw new PublicationApiError(0, 'CONFIG_UNAVAILABLE', 'API unavailable')
    return target.type === 'series'
      ? client.seriesReadiness(target.id, signal)
      : client.readiness(target.id, signal)
  }
  return queryOptions({
    queryKey: ownerPublicationKey(identity, target),
    retry: false,
    staleTime: 0,
    gcTime: 300000,
    enabled: typeof window !== 'undefined',
    queryFn: ({ signal }) => read(signal),
  })
}
export function ownerPublicationMutationOptions(
  client: PublicationClient | undefined,
  identity: string,
  target: PublicationTarget,
  signal?: AbortSignal,
) {
  return mutationOptions({
    mutationKey: [...ownerPublicationKey(identity, target), 'command'],
    retry: false,
    networkMode: 'always',
    mutationFn: async (intent: PublicationIntent) => {
      if (!client)
        throw new PublicationApiError(
          0,
          'CONFIG_UNAVAILABLE',
          'API unavailable',
        )
      if (intent.action === 'archive') {
        if (target.type === 'series')
          throw new PublicationApiError(
            0,
            'UNSUPPORTED_COMMAND',
            'Series archive is unavailable in this workflow',
          )
        return client.archive(
          target.id,
          { expectedVersion: intent.expectedVersion },
          signal,
        )
      }
      const input = {
        expectedVersion: intent.expectedVersion,
        idempotencyKey: intent.idempotencyKey!,
      }
      return target.type === 'series'
        ? client.publishSeries(target.id, input, signal)
        : client.publish(target.id, input, signal)
    },
  })
}
export async function invalidateOwnerPublication(
  cache: QueryClient,
  identity: string,
  target: PublicationTarget,
) {
  const seriesId = target.type === 'series' ? target.id : target.seriesId
  await Promise.all(
    [
      contentKeys.lists(identity),
      contentKeys.detail(identity, 'series', seriesId),
      seriesKeys.owner(identity, seriesId),
      publicationKeys.series(identity, seriesId),
      ownerPublicationKey(identity, target),
      mediaKeys.owner(identity, {
        ownerType: target.type === 'series' ? 'series' : 'video',
        ownerId: target.id,
      }),
    ].map((queryKey) =>
      cache.invalidateQueries({ queryKey, refetchType: 'none' }),
    ),
  )
}
