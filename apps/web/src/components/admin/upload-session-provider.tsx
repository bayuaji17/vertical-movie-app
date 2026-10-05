import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { stopAdminPrivateEffects } from '#/lib/auth/private-effects'
import { MediaLeaveDialog } from './media-leave-dialog'

export function UploadSessionProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient()
  useEffect(() => () => stopAdminPrivateEffects(cache), [cache])
  return (
    <>
      {children}
      <MediaLeaveDialog />
    </>
  )
}
