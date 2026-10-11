import { PrivateApiError, unwrapPrivateResult } from '../api/private-result'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import type { ApiFetcher } from '../api/client'
import type { QueryClient } from '@tanstack/react-query'
import { isUuid } from './content-identifiers'

export type Genre = {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  // Videos and series that currently carry this genre.
  usageCount: number
}
export type GenrePage = { items: Genre[]; nextCursor: string | null }
export type GenreInput = { name: string; slug?: string }

export class GenresApiError extends PrivateApiError {}

// `canEdit` reflects the live API: rename and delete exist (GEN-API-001). A
// client without them (or a read-only fixture) reports false and the UI keeps
// the actions disabled instead of calling a missing endpoint.
export type GenresClient = {
  readonly canEdit: boolean
  list: (
    search: string,
    cursor?: string,
    signal?: AbortSignal,
  ) => Promise<GenrePage>
  create: (input: GenreInput) => Promise<Genre>
  rename: (
    id: string,
    input: GenreInput,
    expectedUpdatedAt: string,
  ) => Promise<Genre>
  remove: (id: string) => Promise<void>
}

const invalidResponse = (): never => {
  throw new GenresApiError(
    0,
    'INVALID_RESPONSE',
    'The response could not be confirmed.',
  )
}
export function verifiedGenre(value: unknown): Genre {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    !isUuid(value.id) ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    !('slug' in value) ||
    typeof value.slug !== 'string' ||
    !('createdAt' in value) ||
    typeof value.createdAt !== 'string' ||
    !('updatedAt' in value) ||
    typeof value.updatedAt !== 'string' ||
    !('usageCount' in value) ||
    typeof value.usageCount !== 'number' ||
    !Number.isInteger(value.usageCount) ||
    value.usageCount < 0
  )
    return invalidResponse()
  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    usageCount: value.usageCount,
  }
}
export function verifiedGenrePage(value: unknown): GenrePage {
  if (
    !value ||
    typeof value !== 'object' ||
    !('items' in value) ||
    !Array.isArray(value.items) ||
    !('nextCursor' in value) ||
    (value.nextCursor !== null && typeof value.nextCursor !== 'string')
  )
    return invalidResponse()
  return {
    items: value.items.map(verifiedGenre),
    nextCursor: value.nextCursor,
  }
}

const unwrap = <T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
) =>
  unwrapPrivateResult(request, {
    fallbackCode: 'GENRES_REQUEST_FAILED',
    failureMessage: 'Genre request failed.',
    networkMessage:
      'The request could not be confirmed. Check the genre list before submitting again.',
    error: (status, code, message) => new GenresApiError(status, code, message),
  })

export function createGenresClient(
  baseUrl: string,
  queryClient: QueryClient,
  fetcher?: ApiFetcher,
): GenresClient {
  const api = createPrivateApiClient(baseUrl, queryClient, fetcher)
  return {
    canEdit: true,
    async list(search, cursor, signal) {
      return verifiedGenrePage(
        await unwrap(
          api.admin.genres.get({
            query: { search, cursor, limit: '20' },
            fetch: { signal },
          }),
        ),
      )
    },
    async create(input) {
      return verifiedGenre(await unwrap(api.admin.genres.post(input)))
    },
    async rename(id, input, expectedUpdatedAt) {
      const genre = verifiedGenre(
        await unwrap(
          api.admin.genres({ id }).patch({ ...input, expectedUpdatedAt }),
        ),
      )
      if (genre.id !== id) return invalidResponse()
      return genre
    },
    async remove(id) {
      const result = await unwrap(api.admin.genres({ id }).delete())
      if (result.id !== id) invalidResponse()
    },
  }
}
export function browserGenresClient(queryClient: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createGenresClient(base, queryClient) : undefined
}
