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
  queryClient.setQueryData(sessionQueryKey, null)
}

export async function clearAdminDataQueries(queryClient: QueryClient) {
  const predicate = ({ queryKey }: { queryKey: readonly unknown[] }) =>
    queryKey[0] === 'admin'
  await queryClient.cancelQueries({ predicate })
  queryClient.removeQueries({ predicate })
}
