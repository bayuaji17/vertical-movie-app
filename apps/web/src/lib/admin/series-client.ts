import type { QueryClient } from '@tanstack/react-query'
import type { ApiFetcher } from '../api/client'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import { unwrapPrivateResult } from '../api/private-result'
import { ContentApiError } from './content-client'
import { isUuid } from './content-identifiers'

type Eden = ReturnType<typeof createPrivateApiClient>
type SeriesRoute = ReturnType<Eden['admin']['series']>
type SeasonRoute = ReturnType<Eden['admin']['seasons']>
type VideoRoute = ReturnType<Eden['admin']['videos']>
export type SeasonCreate = Parameters<SeriesRoute['seasons']['post']>[0]
export type SeasonPatch = Parameters<SeasonRoute['patch']>[0]
export type EpisodeCreate = Extract<
  Parameters<Eden['admin']['videos']['post']>[0],
  { kind: 'episode' }
>
export type EpisodePatch = Parameters<VideoRoute['patch']>[0]
export type Season = NonNullable<
  Awaited<ReturnType<SeasonRoute['patch']>>['data']
>
type VideoDetail = NonNullable<Awaited<ReturnType<VideoRoute['get']>>['data']>
export type Episode = VideoDetail & {
  kind: 'episode'
  seasonId: string
  episodeNumber: number
  series: NonNullable<VideoDetail['series']>
  season: NonNullable<VideoDetail['season']>
}
export type EpisodeFilters = {
  seriesId: string
  seasonId: string
  search: string
  includeArchived: boolean
}

const unwrap = <T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
) =>
  unwrapPrivateResult(request, {
    fallbackCode: 'CONTENT_REQUEST_FAILED',
    failureMessage: 'Series content request failed.',
    networkMessage:
      'The save could not be confirmed. Check the current season or episode before submitting again.',
    error: (status, code, message) =>
      new ContentApiError(status, code, message),
  })

function invalid(): never {
  throw new ContentApiError(
    0,
    'INVALID_RESPONSE',
    'The response could not be confirmed.',
  )
}
function positive(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) > 0 &&
    Number(value) <= 2147483647
  )
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}
function audit(value: unknown, id?: string, version?: number) {
  const row = record(value)
  if (
    !isUuid(row.id) ||
    (id !== undefined && row.id !== id) ||
    !positive(row.rowVersion) ||
    (version !== undefined && row.rowVersion !== version) ||
    typeof row.createdAt !== 'string' ||
    typeof row.updatedAt !== 'string' ||
    !(row.archivedAt === null || typeof row.archivedAt === 'string')
  )
    invalid()
  return row
}
function verifiedSeason(
  value: unknown,
  seriesId: string,
  id?: string,
  version?: number,
): Season {
  const row = audit(value, id, version)
  if (
    row.seriesId !== seriesId ||
    !positive(row.seasonNumber) ||
    !(row.title === null || typeof row.title === 'string') ||
    !(row.description === null || typeof row.description === 'string') ||
    !(row.releaseYear === null || Number.isInteger(row.releaseYear)) ||
    !(row.releaseDate === null || typeof row.releaseDate === 'string')
  )
    invalid()
  return value as Season
}
function verifiedVideo(value: unknown, id?: string, version?: number) {
  const row = audit(value, id, version)
  if (
    row.kind !== 'episode' ||
    !isUuid(row.seasonId) ||
    !positive(row.episodeNumber) ||
    typeof row.title !== 'string' ||
    typeof row.slug !== 'string' ||
    !['draft', 'published', 'archived'].includes(
      String(row.publicationStatus),
    ) ||
    !Array.isArray(row.genreIds) ||
    !row.genreIds.every(isUuid)
  )
    invalid()
  return row
}
function verifiedEpisode(
  value: unknown,
  seriesId: string,
  id?: string,
): Episode {
  const row = verifiedVideo(value, id)
  const series = record(row.series),
    season = record(row.season)
  if (
    series.id !== seriesId ||
    season.id !== row.seasonId ||
    !positive(season.seasonNumber) ||
    typeof series.title !== 'string' ||
    typeof series.slug !== 'string' ||
    !(season.title === null || typeof season.title === 'string') ||
    !Array.isArray(row.effectiveGenres) ||
    !row.effectiveGenres.every((genre: unknown) => {
      const item = record(genre)
      return (
        isUuid(item.id) &&
        typeof item.name === 'string' &&
        typeof item.slug === 'string'
      )
    })
  )
    invalid()
  return value as Episode
}
function identifiers(...ids: string[]) {
  if (!ids.every(isUuid))
    throw new ContentApiError(
      0,
      'INVALID_INPUT',
      'A valid content identity is required.',
    )
}

export function createSeriesClient(
  baseUrl: string,
  cache: QueryClient,
  fetcher?: ApiFetcher,
) {
  const api = createPrivateApiClient(baseUrl, cache, fetcher)
  return {
    async seasons(
      seriesId: string,
      includeArchived = false,
      signal?: AbortSignal,
    ) {
      identifiers(seriesId)
      const data = record(
        await unwrap(
          api.admin.series({ id: seriesId }).seasons.get({
            query: { includeArchived: includeArchived ? 'true' : 'false' },
            fetch: { signal },
          }),
        ),
      )
      if (!Array.isArray(data.items)) invalid()
      const items = data.items.map((item) => verifiedSeason(item, seriesId))
      if (
        new Set(items.map((item) => item.id)).size !== items.length ||
        (!includeArchived && items.some((item) => item.archivedAt !== null))
      )
        invalid()
      return { items }
    },
    async createSeason(
      seriesId: string,
      input: SeasonCreate,
      signal?: AbortSignal,
    ) {
      identifiers(seriesId)
      const result = verifiedSeason(
        await unwrap(
          api.admin
            .series({ id: seriesId })
            .seasons.post(input, { fetch: { signal } }),
        ),
        seriesId,
        undefined,
        1,
      )
      if (
        result.seasonNumber !== input.seasonNumber ||
        result.archivedAt !== null
      )
        invalid()
      return result
    },
    async patchSeason(
      seriesId: string,
      id: string,
      input: SeasonPatch,
      signal?: AbortSignal,
    ) {
      identifiers(seriesId, id)
      const result = verifiedSeason(
        await unwrap(
          api.admin.seasons({ id }).patch(input, { fetch: { signal } }),
        ),
        seriesId,
        id,
        input.expectedVersion + 1,
      )
      if (
        result.archivedAt !== null ||
        (input.seasonNumber !== undefined &&
          result.seasonNumber !== input.seasonNumber)
      )
        invalid()
      return result
    },
    async episodes(
      filters: EpisodeFilters,
      cursor?: string,
      signal?: AbortSignal,
    ) {
      identifiers(filters.seriesId, filters.seasonId)
      const data = record(
        await unwrap(
          api.admin.videos.get({
            query: {
              ...filters,
              kind: 'episode',
              limit: '20',
              cursor,
              includeArchived: filters.includeArchived ? 'true' : 'false',
            },
            fetch: { signal },
          }),
        ),
      )
      if (
        !Array.isArray(data.items) ||
        data.items.length > 20 ||
        !(
          data.nextCursor === null ||
          (typeof data.nextCursor === 'string' &&
            data.nextCursor.length > 0 &&
            data.nextCursor.length <= 2048 &&
            data.nextCursor !== cursor)
        )
      )
        invalid()
      const items = data.items.map((item) =>
        verifiedEpisode(item, filters.seriesId),
      )
      if (
        new Set(items.map((item) => item.id)).size !== items.length ||
        items.some(
          (item) =>
            item.seasonId !== filters.seasonId ||
            (!filters.includeArchived && item.archivedAt !== null),
        )
      )
        invalid()
      return { items, nextCursor: data.nextCursor }
    },
    async episode(seriesId: string, id: string, signal?: AbortSignal) {
      identifiers(seriesId, id)
      return verifiedEpisode(
        await unwrap(api.admin.videos({ id }).get({ fetch: { signal } })),
        seriesId,
        id,
      )
    },
    async createEpisode(input: EpisodeCreate, signal?: AbortSignal) {
      identifiers(input.seasonId)
      const result = await unwrap(
        api.admin.videos.post(input, { fetch: { signal } }),
      )
      const row = verifiedVideo(result, undefined, 1)
      if (
        row.seasonId !== input.seasonId ||
        row.episodeNumber !== input.episodeNumber ||
        row.publicationStatus !== 'draft' ||
        row.archivedAt !== null
      )
        invalid()
      return result
    },
    async patchEpisode(id: string, input: EpisodePatch, signal?: AbortSignal) {
      identifiers(id, ...(input.seasonId ? [input.seasonId] : []))
      const result = await unwrap(
        api.admin.videos({ id }).patch(input, { fetch: { signal } }),
      )
      const row = verifiedVideo(result, id, input.expectedVersion + 1)
      if (
        row.publicationStatus !== 'draft' ||
        row.archivedAt !== null ||
        (input.seasonId !== undefined && row.seasonId !== input.seasonId) ||
        (input.episodeNumber !== undefined &&
          row.episodeNumber !== input.episodeNumber)
      )
        invalid()
      return result
    },
  }
}
export type SeriesClient = ReturnType<typeof createSeriesClient>
export function browserSeriesClient(cache: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createSeriesClient(base, cache) : undefined
}
