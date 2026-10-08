import { useEffect, useMemo, useReducer, useSyncExternalStore } from 'react'
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { registerPrivateEffect } from '#/lib/auth/private-effects'
import { browserContentClient } from '#/lib/admin/content-client'
import type { ContentType } from '#/lib/admin/content-client'
import { contentDetailOptions } from '#/lib/admin/content-queries'
import { browserMediaClient } from '#/lib/admin/media-client'
import { ownerMediaOptions, mediaPollInterval } from '#/lib/admin/media-queries'
import { browserPublicationClient } from '#/lib/admin/publication-client'
import {
  invalidatePublication,
  publicationKeys,
  scopePublicationRead,
  publicationMutationOptions,
  publicationReadinessOptions,
} from '#/lib/admin/publication-queries'
import { PublicationController } from '#/lib/admin/publication-state'
import { PublicationApiError } from '#/lib/admin/publication-errors'
import { inventoryNeedsPolling } from '#/lib/admin/media-state'

const noUploads = () => false
export function usePublication(
  type: Exclude<ContentType, 'series'>,
  id: string,
  uploadBusy: () => boolean = noUploads,
) {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    [, changed] = useReducer((n: number) => n + 1, 0)
  const online = useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
    () => true,
  )
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
                scopePublicationRead(signal, querySignal, (scoped) =>
                  clients.content!.detail(type, id, scoped),
                ),
            }),
            cache.fetchQuery({
              ...mediaOptions,
              queryFn: ({ signal: querySignal }) =>
                scopePublicationRead(signal, querySignal, (scoped) =>
                  clients.media!.owner(
                    { ownerType: 'video', ownerId: id },
                    scoped,
                  ),
                ),
            }),
            cache.fetchQuery({
              ...readinessOptions,
              queryFn: ({ signal: querySignal }) =>
                scopePublicationRead(signal, querySignal, (scoped) =>
                  clients.publication!.readiness(id, scoped),
                ),
            }),
          ])
          return { detail, media: freshMedia, readiness: freshReadiness }
        },
      }),
    [cache, clients, id, type, user.id, uploadBusy],
  )
  const mediaSignature = media.data
    ? JSON.stringify([
        media.data.rowVersion,
        media.data.status,
        media.data.source?.current?.id,
        media.data.source?.current?.state,
        media.data.source?.current?.verifiedReadyAt,
        media.data.source?.busy,
        media.data.poster.current?.id,
        media.data.poster.current?.state,
        media.data.poster.current?.verifiedReadyAt,
        media.data.poster.busy,
      ])
    : undefined
  useEffect(() => {
    if (mediaSignature)
      void cache.invalidateQueries({
        queryKey: publicationKeys.video(user.id, id),
        exact: true,
      })
  }, [cache, id, user.id, mediaSignature])
  useEffect(() => {
    controller.activate()
    const release = registerPrivateEffect(cache, () => controller.dispose())
    return () => {
      release()
      controller.dispose()
    }
  }, [cache, controller])
  return { controller, state: controller.snapshot(), readiness, media, online }
}
