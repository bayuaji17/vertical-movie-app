import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import type { ApiFetcher } from '../api/client'
import type { QueryClient } from '@tanstack/react-query'

export type ContentType = 'film' | 'standalone' | 'series'
export const contentTypes = ['film', 'standalone', 'series'] as const
export const contentLabels: Record<ContentType, string> = {
  film: 'Film',
  standalone: 'Standalone',
  series: 'Series',
}
export function isContentType(value: unknown): value is ContentType {
  return contentTypes.some((type) => type === value)
}
type Eden = ReturnType<typeof createPrivateApiClient>
export type VideoCreate = Extract<
  Parameters<Eden['admin']['videos']['post']>[0],
  { kind: 'movie' | 'standalone' }
>
export type SeriesCreate = Parameters<Eden['admin']['series']['post']>[0]
export type VideoPatch = Parameters<
  ReturnType<Eden['admin']['videos']>['patch']
>[0]
export type SeriesPatch = Parameters<
  ReturnType<Eden['admin']['series']>['patch']
>[0]
export type ContentFilters = {
  type: ContentType
  search: string
  includeArchived: boolean
  page: number
  pageSize: number
}
export class ContentApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}
function domainCode(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'error' in value &&
    value.error &&
    typeof value.error === 'object' &&
    'code' in value.error &&
    typeof value.error.code === 'string'
  )
    return value.error.code
  return 'CONTENT_REQUEST_FAILED'
}
async function unwrap<T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
): Promise<T> {
  let result: Awaited<typeof request>
  try {
    result = await request
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    )
      throw error
    throw new ContentApiError(
      0,
      'NETWORK_ERROR',
      'The request could not be confirmed. Check the content list before submitting again.',
    )
  }
  if (
    result.error &&
    result.error.value &&
    typeof result.error.value === 'object' &&
    'name' in result.error.value &&
    result.error.value.name === 'AbortError'
  )
    throw result.error.value
  // Eden 1.4.10 wraps fetch exceptions in a synthetic 503 with the original Error.
  if (result.error?.value instanceof Error)
    throw new ContentApiError(
      0,
      'NETWORK_ERROR',
      'The request could not be confirmed. Check the content list before submitting again.',
    )
  if (result.error)
    throw new ContentApiError(
      result.error.status,
      domainCode(result.error.value),
      'Content request failed.',
    )
  if (result.data === null)
    throw new ContentApiError(
      0,
      'INVALID_RESPONSE',
      'The response could not be confirmed.',
    )
  return result.data
}
export function createContentClient(
  baseUrl: string,
  queryClient: QueryClient,
  fetcher?: ApiFetcher,
) {
  const api = createPrivateApiClient(baseUrl, queryClient, fetcher)
  return {
    list: (filters: ContentFilters, signal?: AbortSignal) =>
      unwrap(
        api.admin.content.get({
          query: {
            ...filters,
            page: String(filters.page),
            pageSize: String(filters.pageSize),
            includeArchived: String(filters.includeArchived) as
              'true' | 'false',
          },
          fetch: { signal },
        }),
      ),
    genres: (search: string, cursor?: string, signal?: AbortSignal) =>
      unwrap(
        api.admin.genres.get({
          query: { search, cursor, limit: '20' },
          fetch: { signal },
        }),
      ),
    async detail(type: ContentType, id: string, signal?: AbortSignal) {
      if (type === 'series')
        return {
          type,
          data: await unwrap(
            api.admin.series({ id }).get({ fetch: { signal } }),
          ),
        } as const
      const data = await unwrap(
        api.admin.videos({ id }).get({ fetch: { signal } }),
      )
      if (
        data.kind !== 'episode' &&
        data.kind !== (type === 'film' ? 'movie' : 'standalone')
      )
        throw new ContentApiError(
          404,
          'CONTENT_NOT_FOUND',
          'Content not found.',
        )
      return { type, data } as const
    },
    createVideo: (input: VideoCreate) => unwrap(api.admin.videos.post(input)),
    createSeries: (input: SeriesCreate) => unwrap(api.admin.series.post(input)),
    patchVideo: (id: string, input: VideoPatch) =>
      unwrap(api.admin.videos({ id }).patch(input)),
    patchSeries: (id: string, input: SeriesPatch) =>
      unwrap(api.admin.series({ id }).patch(input)),
  }
}
export type ContentClient = ReturnType<typeof createContentClient>
export type ContentDetail = Awaited<ReturnType<ContentClient['detail']>>
export type ContentPage = Awaited<ReturnType<ContentClient['list']>>
export type ContentItem = ContentPage['items'][number]
export function browserContentClient(queryClient: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createContentClient(base, queryClient) : undefined
}
