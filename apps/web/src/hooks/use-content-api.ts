import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { browserContentClient } from '#/lib/admin/content-client'

export function useContentApi() {
  const queryClient = useQueryClient()
  const { user } = useAdminPrincipal()
  const client = useMemo(() => browserContentClient(queryClient), [queryClient])
  return { client, identity: user.id, queryClient }
}
