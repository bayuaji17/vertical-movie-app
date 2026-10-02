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
  queryClient.removeQueries({ predicate })
}
