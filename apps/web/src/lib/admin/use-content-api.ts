import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '../auth/session-context'
import { browserContentClient } from './content-client'

export function useContentApi() {
  const queryClient = useQueryClient()
  const { user } = useAdminPrincipal()
  const client = useMemo(() => browserContentClient(queryClient), [queryClient])
  return { client, identity: user.id, queryClient }
}
