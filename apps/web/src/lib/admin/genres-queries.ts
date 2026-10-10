import { infiniteQueryOptions, mutationOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { GenresApiError } from './genres-client'
import type { GenreInput, GenresClient } from './genres-client'

export const genresKeys = {
  root: (identity: string) => ['admin', identity, 'genres'] as const,
  list: (identity: string, search: string) =>
    [...genresKeys.root(identity), 'list', search] as const,
  mutation: (identity: string, action: string) =>
    [...genresKeys.root(identity), 'mutation', action] as const,
}
function configured(client?: GenresClient): GenresClient {
  if (!client)
    throw new GenresApiError(
      0,
      'CONFIG_UNAVAILABLE',
      'API configuration is unavailable.',
    )
  return client
}
export function genreListOptions(
  client: GenresClient | undefined,
  identity: string,
  search: string,
) {
  return infiniteQueryOptions({
    retry: false as const,
    staleTime: 15000,
    gcTime: 300000,
    queryKey: genresKeys.list(identity, search),
    enabled: typeof window !== 'undefined',
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      configured(client).list(search, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}
export function createGenreOptions(
  client: GenresClient | undefined,
  identity: string,
) {
  return mutationOptions({
    mutationKey: genresKeys.mutation(identity, 'create'),
    retry: false,
    mutationFn: (input: GenreInput) => configured(client).create(input),
  })
}
export function renameGenreOptions(
  client: GenresClient | undefined,
  identity: string,
) {
  return mutationOptions({
    mutationKey: genresKeys.mutation(identity, 'rename'),
    retry: false,
    mutationFn: (command: { id: string; input: GenreInput }) =>
      configured(client).rename(command.id, command.input),
  })
}
export function removeGenreOptions(
  client: GenresClient | undefined,
  identity: string,
) {
  return mutationOptions({
    mutationKey: genresKeys.mutation(identity, 'remove'),
    retry: false,
    mutationFn: (id: string) => configured(client).remove(id),
  })
}
export async function invalidateGenres(
  queryClient: QueryClient,
  identity: string,
) {
  await queryClient.invalidateQueries({
    queryKey: [...genresKeys.root(identity), 'list'],
  })
}
