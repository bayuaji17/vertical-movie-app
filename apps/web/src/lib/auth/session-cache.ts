import type { QueryClient } from '@tanstack/react-query'

export const sessionQueryKey = ['auth', 'session'] as const

export function isAdminPrivateQueryKey(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === 'auth' || queryKey[0] === 'admin'
}

export async function clearAdminPrivateQueries(
  queryClient: QueryClient,
): Promise<void> {
  const predicate = ({ queryKey }: { queryKey: readonly unknown[] }) =>
    isAdminPrivateQueryKey(queryKey)

  await queryClient.cancelQueries({ predicate })
  queryClient.removeQueries({
    predicate: (query) =>
      predicate(query) &&
      !(query.queryKey[0] === 'auth' && query.queryKey[1] === 'session'),
  })
  clearPrivateMutations(queryClient, isAdminPrivateQueryKey)
  queryClient.setQueryData(sessionQueryKey, null)
}

export async function clearAdminDataQueries(queryClient: QueryClient) {
  const predicate = ({ queryKey }: { queryKey: readonly unknown[] }) =>
    queryKey[0] === 'admin'
  await queryClient.cancelQueries({ predicate })
  queryClient.removeQueries({ predicate })
  clearPrivateMutations(queryClient, (key) => key[0] === 'admin')
}

function clearPrivateMutations(
  queryClient: QueryClient,
  matches: (key: readonly unknown[]) => boolean,
) {
  const cache = queryClient.getMutationCache()
  for (const mutation of cache.getAll())
    if (matches(mutation.options.mutationKey ?? [])) cache.remove(mutation)
}
