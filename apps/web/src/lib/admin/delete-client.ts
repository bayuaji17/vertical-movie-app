import type { QueryClient } from '@tanstack/react-query'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import type { ApiFetcher } from '../api/client'
import { PrivateApiError, unwrapPrivateResult } from '../api/private-result'
import { isUuid } from './content-identifiers'

export class DeleteApiError extends PrivateApiError {}
export type DeleteKind =
  'movie' | 'standalone' | 'episode' | 'season' | 'series'
export type DeleteSummary = {
  series: number
  seasons: number
  videos: number
  assets: number
  uploadSessions: number
  jobs: number
  storageObjects: number
}
export type DeleteResult = {
  id: string
  kind: DeleteKind
  removed: DeleteSummary
}
const summaryKeys = [
  'series',
  'seasons',
  'videos',
  'assets',
  'uploadSessions',
  'jobs',
  'storageObjects',
] as const
const kinds = ['movie', 'standalone', 'episode', 'season', 'series']
const messages: Record<string, string> = {
  CONTENT_BUSY:
    'An upload or media job is still running. Abort the upload or wait for processing to finish, then try again.',
  CONTENT_STATE_CONFLICT:
    'Published content cannot be deleted. Archive it first, then delete it.',
  CONTENT_VERSION_CONFLICT:
    'This content has changed. Reload it and review before deleting.',
  CONTENT_NOT_FOUND: 'This content has already been deleted.',
  VALIDATION_ERROR: 'This request is not supported. Reload and try again.',
  AUTH_REQUIRED: 'Your admin session has ended. Sign in again.',
  ADMIN_FORBIDDEN: 'Admin access could not be confirmed.',
  AUTH_DEPENDENCY_UNAVAILABLE: 'Admin access is temporarily unavailable.',
  OFFLINE:
    'You are offline. Reconnect, then check the content before retrying.',
  CONFIG_UNAVAILABLE: 'API configuration is unavailable.',
}
export function deleteFailure(error: unknown) {
  const code =
    error instanceof DeleteApiError ? error.code : 'DELETE_REQUEST_FAILED'
  return {
    code,
    // A failure the server may or may not have applied: check before retrying.
    unconfirmed:
      !(error instanceof DeleteApiError) ||
      error.status === 0 ||
      error.status >= 500,
    message:
      messages[code] ??
      'The result could not be confirmed. Check the content before retrying.',
  }
}
const unwrap = <T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
) =>
  unwrapPrivateResult(request, {
    fallbackCode: 'DELETE_REQUEST_FAILED',
    failureMessage: 'Delete request failed.',
    networkMessage:
      'The result could not be confirmed. Check the content before retrying.',
    error: (status, code, message) => new DeleteApiError(status, code, message),
  })
function confirmed(value: unknown, id: string, expected: DeleteKind[]) {
  const raw = value as Partial<DeleteResult> | null
  const removed = raw?.removed as Record<string, unknown> | undefined
  if (
    !raw ||
    raw.id !== id ||
    !isUuid(raw.id) ||
    !kinds.includes(String(raw.kind)) ||
    !expected.includes(raw.kind as DeleteKind) ||
    !removed ||
    summaryKeys.some(
      (key) =>
        typeof removed[key] !== 'number' ||
        !Number.isSafeInteger(removed[key]) ||
        removed[key] < 0,
    )
  )
    throw new DeleteApiError(
      0,
      'INVALID_RESPONSE',
      'The response could not be confirmed.',
    )
  return raw as DeleteResult
}
export function createDeleteClient(
  baseUrl: string,
  cache: QueryClient,
  fetcher?: ApiFetcher,
) {
  const api = createPrivateApiClient(baseUrl, cache, fetcher)
  const query = (expectedVersion: number) => ({
    expectedVersion: String(expectedVersion),
  })
  return {
    async video(
      id: string,
      expectedVersion: number,
      signal?: AbortSignal,
    ): Promise<DeleteResult> {
      return confirmed(
        await unwrap(
          api.admin.videos({ id }).delete(
            {},
            {
              query: query(expectedVersion),
              fetch: { signal },
            },
          ),
        ),
        id,
        ['movie', 'standalone', 'episode'],
      )
    },
    async season(
      id: string,
      expectedVersion: number,
      signal?: AbortSignal,
    ): Promise<DeleteResult> {
      return confirmed(
        await unwrap(
          api.admin.seasons({ id }).delete(
            {},
            {
              query: query(expectedVersion),
              fetch: { signal },
            },
          ),
        ),
        id,
        ['season'],
      )
    },
    async series(
      id: string,
      expectedVersion: number,
      signal?: AbortSignal,
    ): Promise<DeleteResult> {
      return confirmed(
        await unwrap(
          api.admin.series({ id }).delete(
            {},
            {
              query: query(expectedVersion),
              fetch: { signal },
            },
          ),
        ),
        id,
        ['series'],
      )
    },
  }
}
export type DeleteClient = ReturnType<typeof createDeleteClient>
export function browserDeleteClient(cache: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createDeleteClient(base, cache) : undefined
}
