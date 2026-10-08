import type {
  PublicationReadiness,
  SeriesPublicationReadiness,
} from '#/lib/admin/publication-client'
import { useEffect, useMemo, useReducer } from 'react'
import {
  useQuery,
  useQueryClient,
  queryOptions,
  onlineManager,
} from '@tanstack/react-query'
import { useAdminPrincipal } from './use-admin-principal'
import { usePublicOnline } from './use-public-online'
import type { PublicationTarget } from '#/lib/admin/owner-publication-queries'
import {
  ownerReadinessOptions,
  ownerPublicationMutationOptions,
  invalidateOwnerPublication,
  ownerPublicationKey,
} from '#/lib/admin/owner-publication-queries'
import type { PublicationDetail } from '#/lib/admin/publication-state'
import { PublicationController } from '#/lib/admin/publication-state'
import { browserPublicationClient } from '#/lib/admin/publication-client'
import { browserContentClient } from '#/lib/admin/content-client'
import { browserSeriesClient } from '#/lib/admin/series-client'
import { browserMediaClient } from '#/lib/admin/media-client'
import { ownerMediaOptions, mediaPollInterval } from '#/lib/admin/media-queries'
import { contentDetailOptions, contentKeys } from '#/lib/admin/content-queries'
import { seriesKeys } from '#/lib/admin/series-queries'
import { scopePublicationRead } from '#/lib/admin/publication-queries'
import { PublicationApiError } from '#/lib/admin/publication-errors'
import { inventoryNeedsPolling } from '#/lib/admin/media-state'
import { registerPrivateEffect } from '#/lib/auth/private-effects'

export function useOwnerPublication(
  target: PublicationTarget,
  uploadBusy: () => boolean,
) {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    online = usePublicOnline(),
    [, changed] = useReducer((n: number) => n + 1, 0)
  const seriesId = target.type === 'series' ? target.id : target.seriesId
  const stable = useMemo<PublicationTarget>(
    () =>
      target.type === 'series'
        ? { type: 'series', id: target.id }
        : { type: 'episode', id: target.id, seriesId },
    [target.type, target.id, seriesId],
  )
  const clients = useMemo(
    () => ({
      publication: browserPublicationClient(cache),
      content: browserContentClient(cache),
      series: browserSeriesClient(cache),
      media: browserMediaClient(cache),
    }),
    [cache],
  )
  const owner = {
    ownerType:
      stable.type === 'series' ? ('series' as const) : ('video' as const),
    ownerId: stable.id,
  }
  const media = useQuery(ownerMediaOptions(clients.media, user.id, owner)),
    readiness = useQuery({
      ...ownerReadinessOptions(clients.publication, user.id, stable),
      refetchIntervalInBackground: false,
      refetchInterval: () =>
        mediaPollInterval(inventoryNeedsPolling(media.data)),
    })
  const controller = useMemo(
    () =>
      new PublicationController({
        id: stable.id,
        changed,
        online: () => onlineManager.isOnline() && navigator.onLine,
        uploadBusy,
        client: {
          publish: async (_id, input, signal) =>
            cache
              .getMutationCache()
              .build(cache, {
                ...ownerPublicationMutationOptions(
                  clients.publication,
                  user.id,
                  stable,
                  signal,
                ),
                mutationFn: async () => {
                  if (!clients.publication)
                    throw new PublicationApiError(
                      0,
                      'CONFIG_UNAVAILABLE',
                      'API unavailable',
                    )
                  return stable.type === 'series'
                    ? clients.publication.publishSeries(
                        stable.id,
                        input,
                        signal,
                      )
                    : clients.publication.publish(stable.id, input, signal)
                },
              })
              .execute({ action: 'publish', ...input }),
          archive: async (_id, input, signal) =>
            cache
              .getMutationCache()
              .build(cache, {
                ...ownerPublicationMutationOptions(
                  clients.publication,
                  user.id,
                  stable,
                  signal,
                ),
                mutationFn: async () => {
                  if (!clients.publication || stable.type === 'series')
                    throw new PublicationApiError(
                      0,
                      'UNSUPPORTED_COMMAND',
                      'Archive unavailable',
                    )
                  return clients.publication.archive(stable.id, input, signal)
                },
              })
              .execute({ action: 'archive', ...input }),
        },
        invalidate: () => invalidateOwnerPublication(cache, user.id, stable),
        read: async (signal) => {
          if (
            !clients.content ||
            !clients.series ||
            !clients.publication ||
            !clients.media
          )
            throw new PublicationApiError(
              0,
              'CONFIG_UNAVAILABLE',
              'API unavailable',
            )
          if (stable.type === 'episode') {
            const parent = contentDetailOptions(
              clients.content,
              user.id,
              'series',
              seriesId,
            )
            await cache.cancelQueries({
              queryKey: parent.queryKey,
              exact: true,
            })
            await cache.fetchQuery({
              ...parent,
              staleTime: 0,
              queryFn: ({ signal: querySignal }) =>
                scopePublicationRead(signal, querySignal, (scoped) =>
                  clients.content!.detail('series', seriesId, scoped),
                ),
            })
            signal.throwIfAborted()
          }
          const metadata = queryOptions({
            queryKey:
              stable.type === 'series'
                ? contentKeys.detail(user.id, 'series', stable.id)
                : [...ownerPublicationKey(user.id, stable), 'metadata'],
            retry: false,
            staleTime: 0,
            queryFn: ({ signal: querySignal }) =>
              scopePublicationRead(
                signal,
                querySignal,
                async (scoped): Promise<PublicationDetail> =>
                  stable.type === 'series'
                    ? clients.content!.detail('series', stable.id, scoped)
                    : {
                        type: 'episode',
                        data: await clients.series!.episode(
                          seriesId,
                          stable.id,
                          scoped,
                        ),
                      },
              ),
          })
          const mediaOptions = ownerMediaOptions(clients.media, user.id, {
              ownerType: stable.type === 'series' ? 'series' : 'video',
              ownerId: stable.id,
            }),
            readinessOptions = ownerReadinessOptions(
              clients.publication,
              user.id,
              stable,
            )
          await Promise.all(
            [
              metadata.queryKey,
              mediaOptions.queryKey,
              readinessOptions.queryKey,
            ].map((queryKey) => cache.cancelQueries({ queryKey, exact: true })),
          )
          signal.throwIfAborted()
          const [detail, freshMedia, freshReadiness] = await Promise.all([
            cache.fetchQuery(metadata),
            cache.fetchQuery({
              ...mediaOptions,
              queryFn: ({ signal: querySignal }) =>
                scopePublicationRead(signal, querySignal, (scoped) =>
                  clients.media!.owner(
                    {
                      ownerType: stable.type === 'series' ? 'series' : 'video',
                      ownerId: stable.id,
                    },
                    scoped,
                  ),
                ),
            }),
            cache.fetchQuery({
              ...readinessOptions,
              queryFn: ({ signal: querySignal }) =>
                scopePublicationRead<
                  PublicationReadiness | SeriesPublicationReadiness
                >(signal, querySignal, (scoped) =>
                  stable.type === 'series'
                    ? clients.publication!.seriesReadiness(stable.id, scoped)
                    : clients.publication!.readiness(stable.id, scoped),
                ),
            }),
          ])
          signal.throwIfAborted()
          // Episode editor queries cache the server DTO, not a top-level content envelope.
          if (stable.type === 'episode' && detail.type === 'episode') {
            cache.setQueryData(
              seriesKeys.episode(user.id, seriesId, stable.id),
              detail.data,
            )
          }
          return { detail, media: freshMedia, readiness: freshReadiness }
        },
      }),
    [cache, clients, stable, seriesId, user.id, uploadBusy],
  )
  const signature = JSON.stringify([
    media.data?.rowVersion,
    media.data?.status,
    media.data?.source?.current?.id,
    media.data?.source?.current?.state,
    media.data?.source?.busy,
    media.data?.poster.current?.id,
    media.data?.poster.current?.state,
    media.data?.poster.busy,
  ])
  useEffect(() => {
    if (media.data)
      void cache.invalidateQueries({
        queryKey: ownerPublicationKey(user.id, stable),
        exact: true,
      })
  }, [cache, user.id, stable, signature])
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
