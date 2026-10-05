import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { isAdminSession } from '@repo/auth/client'
import type { SessionSnapshot } from '@repo/auth/types'
import { sessionQueryKey } from '#/lib/auth/session-cache'
import {
  hasWorkingUploads,
  pauseUploads,
  subscribeUploads,
  uploadRevision,
} from '#/lib/admin/upload-session-registry'
import { MediaConfirmDialog } from './media-confirm-dialog'

export function MediaLeaveDialog() {
  const cache = useQueryClient()
  const subscribe = useCallback(
    (listener: () => void) => subscribeUploads(cache, listener),
    [cache],
  )
  const snapshot = useCallback(() => uploadRevision(cache), [cache])
  useSyncExternalStore(subscribe, snapshot, () => 0)
  const protect = useCallback(
    () =>
      hasWorkingUploads(cache) &&
      cache.getQueryState(sessionQueryKey)?.status === 'success' &&
      isAdminSession(
        cache.getQueryData<SessionSnapshot | null>(sessionQueryKey) ?? null,
      ),
    [cache],
  )
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => next.pathname !== '/admin/login' && protect(),
    enableBeforeUnload: protect,
    withResolver: true,
  })
  const release = useRef<(() => void) | undefined>(undefined)
  useEffect(() => {
    release.current = blocker.proceed
    if (blocker.status === 'blocked' && !protect()) blocker.proceed()
  }, [blocker, protect])
  useEffect(() => () => release.current?.(), [])
  return (
    <MediaConfirmDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open) blocker.reset?.()
      }}
      title="Pause upload and leave?"
      description="Leaving pauses file checking and upload in this tab. The server session remains available until it expires. After returning, select the same file to resume."
      confirmLabel="Pause and leave"
      cancelLabel="Stay here"
      onConfirm={() => {
        pauseUploads(cache)
        blocker.proceed?.()
      }}
    />
  )
}
