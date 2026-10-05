import { useEffect, useRef, useCallback } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { isAdminSession } from '@repo/auth/client'
import type { SessionSnapshot } from '@repo/auth/types'
import { sessionQueryKey } from '#/lib/auth/session-cache'
import { DiscardDialog } from './discard-dialog'

export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const cache = useQueryClient()
  const shouldProtect = useCallback(
    () =>
      dirty &&
      cache.getQueryState(sessionQueryKey)?.status === 'success' &&
      isAdminSession(
        cache.getQueryData<SessionSnapshot | null>(sessionQueryKey) ?? null,
      ),
    [cache, dirty],
  )
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) =>
      next.pathname !== '/admin/login' && shouldProtect(),
    enableBeforeUnload: shouldProtect,
    withResolver: true,
  })
  const release = useRef<(() => void) | undefined>(undefined)
  useEffect(() => {
    release.current = blocker.proceed
    if (!dirty && blocker.status === 'blocked') blocker.proceed()
  }, [dirty, blocker])
  useEffect(() => () => release.current?.(), [])
  return (
    <DiscardDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open) blocker.reset?.()
      }}
      title="Discard unsaved changes?"
      description="Your changes have not been saved. Keep editing to retain them, or discard them to leave this page."
      confirmLabel="Discard and leave"
      onConfirm={() => blocker.proceed?.()}
    />
  )
}
