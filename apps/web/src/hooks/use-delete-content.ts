import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { browserDeleteClient, DeleteApiError } from '#/lib/admin/delete-client'
import type { DeleteResult } from '#/lib/admin/delete-client'
import type { DeleteTarget } from '#/lib/admin/delete-state'

/**
 * Delete a draft/archived item. `afterDelete` runs first (usually navigation
 * away from the deleted page); only then are admin queries refreshed, so a
 * page that no longer exists is never refetched.
 */
export function useDeleteContent() {
  const queryClient = useQueryClient()
  const { user } = useAdminPrincipal()
  const client = useMemo(() => browserDeleteClient(queryClient), [queryClient])
  const mutation = useMutation({
    retry: false,
    mutationFn: async (target: DeleteTarget): Promise<DeleteResult> => {
      if (!client)
        throw new DeleteApiError(
          0,
          'CONFIG_UNAVAILABLE',
          'API configuration is unavailable.',
        )
      return target.kind === 'season'
        ? client.season(target.id, target.version)
        : target.kind === 'series'
          ? client.series(target.id, target.version)
          : client.video(target.id, target.version)
    },
  })
  return {
    pending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    async run(
      target: DeleteTarget,
      afterDelete?: (result: DeleteResult) => void | Promise<void>,
    ) {
      const result = await mutation.mutateAsync(target)
      await afterDelete?.(result)
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey.includes(target.id) && query.queryKey[0] === 'admin',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin', user.id] })
      return result
    },
  }
}
