import { PrivateApiError, unwrapPrivateResult } from '../api/private-result'
import { isUuid } from './content-identifiers'
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
export class ContentApiError extends PrivateApiError {}
const unwrap = <T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
) =>
  unwrapPrivateResult(request, {
    fallbackCode: 'CONTENT_REQUEST_FAILED',
    failureMessage: 'Content request failed.',
    networkMessage:
      'The request could not be confirmed. Check the content list before submitting again.',
    error: (status, code, message) =>
      new ContentApiError(status, code, message),
  })

function invalidResponse(): never {
  throw new ContentApiError(
    0,
    'INVALID_RESPONSE',
    'The response could not be confirmed.',
  )
}
function verifiedRecord<T>(value: T, version: number, id?: string): T {
  const raw: unknown = value
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('id' in raw) ||
    !isUuid(raw.id) ||
    !('rowVersion' in raw) ||
    raw.rowVersion !== version ||
    !('title' in raw) ||
    typeof raw.title !== 'string' ||
    !('slug' in raw) ||
    typeof raw.slug !== 'string' ||
    (id && raw.id !== id)
  )
    invalidResponse()
  return value
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

    async createVideo(input: VideoCreate) {
      return verifiedRecord(await unwrap(api.admin.videos.post(input)), 1)
    },
    async createSeries(input: SeriesCreate) {
      const result = await unwrap(api.admin.series.post(input))
      verifiedRecord(result.series, 1)
      const raw: unknown = result.defaultSeason
      if (
        !raw ||
        typeof raw !== 'object' ||
        !('id' in raw) ||
        !isUuid(raw.id) ||
        !('seriesId' in raw) ||
        raw.seriesId !== result.series.id ||
        !('seasonNumber' in raw) ||
        raw.seasonNumber !== 1
      )
        invalidResponse()
      return result
    },
    async patchVideo(id: string, input: VideoPatch) {
      return verifiedRecord(
        await unwrap(api.admin.videos({ id }).patch(input)),
        input.expectedVersion + 1,
        id,
      )
    },
    async patchSeries(id: string, input: SeriesPatch) {
      return verifiedRecord(
        await unwrap(api.admin.series({ id }).patch(input)),
        input.expectedVersion + 1,
        id,
      )
    },
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
