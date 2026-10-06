import { useEffect, useMemo, useReducer } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '../auth/session-context'
import { browserMediaClient } from './media-client'
import type { MediaClient, MediaOwner, OwnerMedia } from './media-client'
import type { ContentType } from './content-client'
import {
  initiateMediaOptions,
  invalidateMedia,
  posterProcessingOptions,
  sessionControlOptions,
} from './media-queries'
import { UploadCoordinator, UploadManager } from './upload-manager'
import { registerPrivateEffect } from '../auth/private-effects'
import {
  notifyUploadState,
  registerUploadManager,
} from './upload-session-registry'

const coordinators = new WeakMap<QueryClient, UploadCoordinator>()
function coordinatorFor(cache: QueryClient) {
  let value = coordinators.get(cache)
  if (!value) {
    value = new UploadCoordinator()
    coordinators.set(cache, value)
  }
  return value
}
export function useUploadManager(
  owner: MediaOwner,
  type: ContentType,
  inventory?: OwnerMedia,
) {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    [, changed] = useReducer((n: number) => n + 1, 0)
  const client = useMemo(() => browserMediaClient(cache), [cache])
  const manager = useMemo(() => {
    if (!client) return undefined
    const target = { ownerType: owner.ownerType, ownerId: owner.ownerId }
    const control: MediaClient = {
      ...client,
      initiate: (input, signal) =>
        cache
          .getMutationCache()
          .build(cache, {
            ...initiateMediaOptions(client, user.id, target),
            mutationFn: (data) => client.initiate(data, signal),
          })
          .execute(input),
      complete: (id, signal) =>
        cache
          .getMutationCache()
          .build(cache, {
            ...sessionControlOptions(client, user.id, target),
            mutationFn: () => client.complete(id, signal),
          })
          .execute({ id, action: 'complete' }),
      abort: (id, signal) =>
        cache
          .getMutationCache()
          .build(cache, {
            ...sessionControlOptions(client, user.id, target),
            mutationFn: () => client.abort(id, signal),
          })
          .execute({ id, action: 'abort' }),
      processPoster: (id, signal) =>
        cache
          .getMutationCache()
          .build(cache, {
            ...posterProcessingOptions(client, user.id, target),
            mutationFn: () => client.processPoster(id, signal),
          })
          .execute({ id }),
    }
    return new UploadManager({
      client: control,
      coordinator: coordinatorFor(cache),
      changed: () => {
        changed()
        notifyUploadState(cache)
      },
      committed: () => invalidateMedia(cache, user.id, target, type),
    })
  }, [cache, client, user.id, owner.ownerId, owner.ownerType, type])
  useEffect(() => {
    if (inventory) manager?.observe(inventory)
  }, [inventory, manager])
  useEffect(() => {
    if (!manager) return
    manager.activate()
    const unregister = registerUploadManager(cache, manager),
      release = registerPrivateEffect(cache, () =>
        manager.pause(undefined, true),
      )
    return () => {
      release()
      unregister()
      manager.dispose()
    }
  }, [manager, cache])
  useEffect(() => {
    const offline = () => manager?.pause()
    window.addEventListener('offline', offline)
    return () => window.removeEventListener('offline', offline)
  }, [manager])
  return { client, manager, identity: user.id }
}
