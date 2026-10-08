import type { QueryClient } from '@tanstack/react-query'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import type { ApiFetcher } from '../api/client'
import { unwrapPrivateResult } from '../api/private-result'
import { PublicationApiError } from './publication-errors'
import { isUuid } from './content-identifiers'

type VideoRoutes = ReturnType<
  ReturnType<typeof createPrivateApiClient>['admin']['videos']
>
export type PublishVideoInput = Parameters<VideoRoutes['publish']['post']>[0]
export type ArchiveVideoInput = Parameters<VideoRoutes['archive']['post']>[0]
export type PublicationReadiness = NonNullable<
  Awaited<ReturnType<VideoRoutes['publication-readiness']['get']>>['data']
>
type SeriesRoutes = ReturnType<
  ReturnType<typeof createPrivateApiClient>['admin']['series']
>
export type SeriesPublicationReadiness = NonNullable<
  Awaited<ReturnType<SeriesRoutes['publication-readiness']['get']>>['data']
>
export const seriesPublicationCheckCodes = [
  'ACTIVE_DRAFT',
  'TITLE',
  'SYNOPSIS',
  'VERIFIED_POSTER',
  'PUBLISHED_EPISODE',
  'NO_ACTIVE_UPLOAD',
] as const
export const publicationCheckCodes = [
  'ACTIVE_DRAFT',
  'TITLE',
  'SYNOPSIS',
  'RIGHTS',
  'VERIFIED_MEDIA',
  'NO_ACTIVE_UPLOAD',
  'ACTIVE_PARENTS',
] as const
const unwrap = <T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
) =>
  unwrapPrivateResult(request, {
    fallbackCode: 'PUBLICATION_REQUEST_FAILED',
    failureMessage: 'Publication request failed.',
    networkMessage:
      'The result could not be confirmed. Check status before retrying.',
    error: (status, code, message) =>
      new PublicationApiError(status, code, message),
  })
function invalid(): never {
  throw new PublicationApiError(
    0,
    'INVALID_RESPONSE',
    'The response could not be confirmed.',
  )
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') invalid()
  return value as Record<string, unknown>
}
const date = (value: unknown) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT/.test(value) &&
  Number.isFinite(Date.parse(value))
const version = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
export function createPublicationClient(
  baseUrl: string,
  cache: QueryClient,
  fetcher?: ApiFetcher,
) {
  const api = createPrivateApiClient(baseUrl, cache, fetcher)
  return {
    async seriesReadiness(id: string, signal?: AbortSignal) {
      const r = await unwrap(
          api.admin
            .series({ id })
            ['publication-readiness'].get({ fetch: { signal } }),
        ),
        raw = record(r),
        checks = raw.checks
      if (
        raw.seriesId !== id ||
        !isUuid(raw.seriesId) ||
        raw.ownerType !== 'series' ||
        !version(raw.rowVersion) ||
        !['draft', 'published', 'unpublished'].includes(
          String(raw.publicationStatus),
        ) ||
        !(raw.archivedAt === null || date(raw.archivedAt)) ||
        typeof raw.canPublish !== 'boolean' ||
        !Array.isArray(checks) ||
        checks.length !== 6
      )
        invalid()
      const rows = checks.map((c: unknown) => record(c))
      if (
        new Set(rows.map((c) => c.code)).size !== 6 ||
        rows.some(
          (c) =>
            !seriesPublicationCheckCodes.some((code) => code === c.code) ||
            !['passed', 'blocked'].includes(String(c.status)),
        ) ||
        raw.canPublish !== rows.every((c) => c.status === 'passed') ||
        (raw.canPublish &&
          (raw.publicationStatus !== 'draft' || raw.archivedAt !== null))
      )
        invalid()
      return r
    },
    async publishSeries(
      id: string,
      input: Parameters<SeriesRoutes['publish']['post']>[0],
      signal?: AbortSignal,
    ) {
      const r = await unwrap(
          api.admin.series({ id }).publish.post(input, { fetch: { signal } }),
        ),
        raw = record(r)
      if (
        raw.id !== id ||
        !isUuid(raw.id) ||
        raw.rowVersion !== input.expectedVersion + 1 ||
        raw.publicationStatus !== 'published' ||
        !date(raw.publishedAt) ||
        !date(raw.firstPublishedAt)
      )
        invalid()
      return r
    },
    async readiness(id: string, signal?: AbortSignal) {
      const r = await unwrap(
        api.admin
          .videos({ id })
          ['publication-readiness'].get({ fetch: { signal } }),
      )
      const raw = record(r)
      const checks = raw.checks
      if (
        raw.videoId !== id ||
        !isUuid(raw.videoId) ||
        !version(raw.rowVersion) ||
        !['movie', 'standalone', 'episode'].includes(String(raw.kind)) ||
        !['draft', 'published', 'archived'].includes(
          String(raw.publicationStatus),
        ) ||
        !(raw.archivedAt === null || date(raw.archivedAt)) ||
        typeof raw.canPublish !== 'boolean' ||
        !Array.isArray(checks) ||
        checks.length !== 7
      )
        invalid()
      const rows = checks.map((check: unknown) => record(check))
      if (
        new Set(rows.map((c) => c.code)).size !== 7 ||
        rows.some(
          (c) =>
            !publicationCheckCodes.some((code) => code === c.code) ||
            !['passed', 'blocked', 'not-applicable'].includes(
              String(c.status),
            ) ||
            (c.status === 'not-applicable' &&
              (c.code !== 'ACTIVE_PARENTS' || raw.kind === 'episode')),
        ) ||
        raw.canPublish !== rows.every((c) => c.status !== 'blocked') ||
        (raw.canPublish &&
          (raw.publicationStatus !== 'draft' || raw.archivedAt !== null))
      )
        invalid()
      return r
    },
    async publish(id: string, input: PublishVideoInput, signal?: AbortSignal) {
      const r = await unwrap(
        api.admin.videos({ id }).publish.post(input, { fetch: { signal } }),
      )
      const raw = record(r)
      if (
        raw.id !== id ||
        !isUuid(raw.id) ||
        !version(raw.rowVersion) ||
        raw.publicationStatus !== 'published' ||
        !date(raw.publishedAt) ||
        !date(raw.firstPublishedAt)
      )
        invalid()
      return r
    },
    async archive(id: string, input: ArchiveVideoInput, signal?: AbortSignal) {
      const r = await unwrap(
        api.admin.videos({ id }).archive.post(input, { fetch: { signal } }),
      )
      const raw = record(r)
      if (
        raw.id !== id ||
        !isUuid(raw.id) ||
        !version(raw.rowVersion) ||
        raw.publicationStatus !== 'archived' ||
        !date(raw.archivedAt) ||
        raw.publishedAt !== null ||
        !['movie', 'standalone', 'episode'].includes(String(raw.kind))
      )
        invalid()
      return r
    },
  }
}
export type PublicationClient = ReturnType<typeof createPublicationClient>
export function browserPublicationClient(cache: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createPublicationClient(base, cache) : undefined
}
