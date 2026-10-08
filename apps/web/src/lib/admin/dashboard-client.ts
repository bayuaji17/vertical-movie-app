import { z } from 'zod'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import { PrivateApiError, unwrapPrivateResult } from '../api/private-result'
import type { ApiFetcher } from '../api/client'
import type { QueryClient } from '@tanstack/react-query'

export type DashboardSummary = NonNullable<
  Awaited<
    ReturnType<
      ReturnType<
        typeof createPrivateApiClient
      >['admin']['dashboard']['summary']['get']
    >
  >['data']
>
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const partitions = z
  .object({
    total: count,
    draft: count,
    published: count,
    archived: count,
    unpublished: count,
  })
  .strict()
  .refine(
    (p) =>
      BigInt(p.total) ===
      BigInt(p.draft) +
        BigInt(p.published) +
        BigInt(p.archived) +
        BigInt(p.unpublished),
  )
const id = z.uuid(),
  date = z.iso.datetime()
const latest = z
  .object({
    type: z.enum(['film', 'standalone', 'series']),
    id,
    title: z.string(),
    publicationStatus: z.enum(['draft', 'published', 'unpublished']),
    createdAt: date,
  })
  .strict()
  .refine(
    (row) => row.publicationStatus !== 'unpublished' || row.type === 'series',
  )
const failure = z
  .object({
    jobId: id,
    type: z.enum(['film', 'standalone', 'series', 'episode']),
    id,
    title: z.string(),
    role: z.enum(['source', 'poster']),
    seriesId: id.nullable(),
  })
  .strict()
  .refine(
    (row) =>
      (row.type === 'episode') === (row.seriesId !== null) &&
      (row.type !== 'series' || row.role === 'poster'),
  )
const schema = z
  .object({
    generatedAt: date,
    content: z
      .object({
        film: partitions,
        standalone: partitions,
        series: partitions,
        episode: partitions,
      })
      .strict(),
    media: z
      .object({ queued: count, running: count, retry: count, failed: count })
      .strict(),
    latestContent: z.array(latest).max(8),
    failedMedia: z.array(failure).max(5),
  })
  .strict()
  .superRefine((value, ctx) => {
    const fail = () =>
      ctx.addIssue({ code: 'custom', message: 'Invalid summary invariant' })
    for (const type of ['film', 'standalone', 'episode'] as const)
      if (value.content[type].unpublished !== 0) fail()
    const active = ['film', 'standalone', 'series'].reduce((n, type) => {
      const c = value.content[type as 'film']
      return n + BigInt(c.total) - BigInt(c.archived)
    }, 0n)
    if (
      value.latestContent.length !== Number(active > 8n ? 8n : active) ||
      value.failedMedia.length !== Math.min(5, value.media.failed)
    )
      fail()
    if (
      new Set(value.failedMedia.map((row) => row.jobId)).size !==
        value.failedMedia.length ||
      new Set(value.latestContent.map((row) => `${row.type}:${row.id}`))
        .size !== value.latestContent.length
    )
      fail()
    for (let i = 1; i < value.latestContent.length; i++) {
      const a = value.latestContent[i - 1],
        b = value.latestContent[i]
      const time = Date.parse(a.createdAt) - Date.parse(b.createdAt)
      if (
        time < 0 ||
        (time === 0 && (a.id < b.id || (a.id === b.id && a.type > b.type)))
      )
        fail()
    }
  })
export function verifiedDashboardSummary(value: unknown): DashboardSummary {
  const result = schema.safeParse(value)
  if (!result.success)
    throw new PrivateApiError(
      0,
      'INVALID_RESPONSE',
      'Dashboard response could not be confirmed.',
    )
  return result.data
}
export function createDashboardClient(
  baseUrl: string,
  cache: QueryClient,
  fetcher?: ApiFetcher,
) {
  const api = createPrivateApiClient(baseUrl, cache, fetcher)
  return {
    async summary(signal?: AbortSignal) {
      const data = await unwrapPrivateResult(
        api.admin.dashboard.summary.get({ fetch: { signal } }),
        {
          fallbackCode: 'DASHBOARD_REQUEST_FAILED',
          failureMessage: 'Dashboard is unavailable.',
          networkMessage: 'Dashboard could not be refreshed.',
          error: (status, code, message) =>
            new PrivateApiError(status, code, message),
        },
      )
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      return verifiedDashboardSummary(data)
    },
  }
}
export type DashboardClient = ReturnType<typeof createDashboardClient>
export function browserDashboardClient(cache: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createDashboardClient(base, cache) : undefined
}
