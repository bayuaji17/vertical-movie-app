import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { browserGenresClient } from '#/lib/admin/genres-client'

export function useGenresApi() {
  const queryClient = useQueryClient()
  const { user } = useAdminPrincipal()
  const client = useMemo(() => browserGenresClient(queryClient), [queryClient])
  return { client, identity: user.id, queryClient }
}
