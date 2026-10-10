import { useCallback, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePublication } from '#/hooks/use-publication'
import { useUploadManager } from '#/hooks/use-upload-manager'
import type { SetupType } from '#/lib/admin/setup-flow'
import {
  hasWorkingUploads,
  subscribeUploads,
  uploadRevision,
} from '#/lib/admin/upload-session-registry'

// One publication controller and one upload manager for the whole stepper, so
// moving between steps never disposes an upload that is still running.
export function useSetupController(type: SetupType, id: string) {
  const cache = useQueryClient()
  useSyncExternalStore(
    (notify) => subscribeUploads(cache, notify),
    () => uploadRevision(cache),
    () => 0,
  )
  const uploadBusy = useCallback(
    () => hasWorkingUploads(cache, { ownerType: 'video', ownerId: id }),
    [cache, id],
  )
  const publication = usePublication(type, id, uploadBusy)
  const owner = { ownerType: 'video' as const, ownerId: id }
  const { manager } = useUploadManager(owner, type, publication.media.data)
  return { publication, manager, owner, uploadBusy: uploadBusy() }
}
