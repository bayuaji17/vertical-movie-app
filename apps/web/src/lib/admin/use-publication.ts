import { useEffect, useMemo, useReducer } from 'react'
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '../auth/session-context'
import { registerPrivateEffect } from '../auth/private-effects'
import { browserContentClient } from './content-client'
import type { ContentType } from './content-client'
import { contentDetailOptions } from './content-queries'
import { browserMediaClient } from './media-client'
import { ownerMediaOptions, mediaPollInterval } from './media-queries'
import { browserPublicationClient } from './publication-client'
import {
  invalidatePublication,
  publicationMutationOptions,
  publicationReadinessOptions,
} from './publication-queries'
import { PublicationController } from './publication-state'
import { PublicationApiError } from './publication-errors'
import { inventoryNeedsPolling } from './media-state'

const noUploads = () => false
export function usePublication(
  type: Exclude<ContentType, 'series'>,
  id: string,
  uploadBusy: () => boolean = noUploads,
) {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    [, changed] = useReducer((n: number) => n + 1, 0)
  const clients = useMemo(
    () => ({
      publication: browserPublicationClient(cache),
      content: browserContentClient(cache),
      media: browserMediaClient(cache),
    }),
    [cache],
  )
  const owner = { ownerType: 'video' as const, ownerId: id }
  const media = useQuery(ownerMediaOptions(clients.media, user.id, owner))
  const readiness = useQuery({
    ...publicationReadinessOptions(clients.publication, user.id, id),
    refetchIntervalInBackground: false,
    refetchInterval: () => mediaPollInterval(inventoryNeedsPolling(media.data)),
  })
  const controller = useMemo(
    () =>
      new PublicationController({
        id,
        changed,
        online: () => onlineManager.isOnline() && navigator.onLine,
        uploadBusy,
        client: {
          publish: async (_id, input, signal) =>
            cache
              .getMutationCache()
              .build(cache, {
                ...publicationMutationOptions(
                  clients.publication,
                  user.id,
                  id,
                  signal,
                ),
                mutationFn: async () => {
                  if (!clients.publication)
                    throw new PublicationApiError(
                      0,
                      'CONFIG_UNAVAILABLE',
                      'API unavailable',
                    )
                  return clients.publication.publish(id, input, signal)
                },
              })
              .execute({ action: 'publish', ...input }),
          archive: async (_id, input, signal) =>
            cache
              .getMutationCache()
              .build(cache, {
                ...publicationMutationOptions(
                  clients.publication,
                  user.id,
                  id,
                  signal,
                ),
                mutationFn: async () => {
                  if (!clients.publication)
                    throw new PublicationApiError(
                      0,
                      'CONFIG_UNAVAILABLE',
                      'API unavailable',
                    )
                  return clients.publication.archive(id, input, signal)
                },
              })
              .execute({ action: 'archive', ...input }),
        },
        invalidate: () => invalidatePublication(cache, user.id, type, id),
        read: async (signal) => {
          if (!clients.publication || !clients.content || !clients.media)
            throw new PublicationApiError(
              0,
              'CONFIG_UNAVAILABLE',
              'API unavailable',
            )
          const detailOptions = contentDetailOptions(
              clients.content,
              user.id,
              type,
              id,
            ),
            mediaOptions = ownerMediaOptions(clients.media, user.id, {
              ownerType: 'video',
              ownerId: id,
            }),
            readinessOptions = publicationReadinessOptions(
              clients.publication,
              user.id,
              id,
            )
          await Promise.all(
            [detailOptions, mediaOptions, readinessOptions].map((o) =>
              cache.cancelQueries({ queryKey: o.queryKey, exact: true }),
            ),
          )
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
          const [detail, freshMedia, freshReadiness] = await Promise.all([
            cache.fetchQuery({
              ...detailOptions,
              staleTime: 0,
              queryFn: ({ signal: querySignal }) =>
                clients.content!.detail(
                  type,
                  id,
                  AbortSignal.any([signal, querySignal]),
                ),
            }),
            cache.fetchQuery({
              ...mediaOptions,
              queryFn: ({ signal: querySignal }) =>
                clients.media!.owner(
                  { ownerType: 'video', ownerId: id },
                  AbortSignal.any([signal, querySignal]),
                ),
            }),
            cache.fetchQuery({
              ...readinessOptions,
              queryFn: ({ signal: querySignal }) =>
                clients.publication!.readiness(
                  id,
                  AbortSignal.any([signal, querySignal]),
                ),
            }),
          ])
          return { detail, media: freshMedia, readiness: freshReadiness }
        },
      }),
    [cache, clients, id, type, user.id, uploadBusy],
  )
  useEffect(() => {
    controller.activate()
    const release = registerPrivateEffect(cache, () => controller.dispose())
    return () => {
      release()
      controller.dispose()
    }
  }, [cache, controller])
  return { controller, state: controller.snapshot(), readiness, media }
}
