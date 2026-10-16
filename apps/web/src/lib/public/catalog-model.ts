import { z } from 'zod'
import { watchVideoSchema } from '../catalog/content-model'
import type { CatalogFilters } from '../catalog/public-catalog-model'

export type CatalogType = 'all' | 'film' | 'standalone' | 'series'
export type BrowseFilterType = Exclude<CatalogType, 'all'>
export const catalogTypes = ['all', 'film', 'standalone', 'series'] as const
export const searchMaxLength = 200
export function catalogType(value: unknown): CatalogType {
  return value === 'film' || value === 'standalone' || value === 'series'
    ? value
    : 'all'
}
// Search text is trimmed and bounded to 200 Unicode code points (API limit).
export function normalizeQuery(value: unknown) {
  return typeof value === 'string'
    ? [...value.trim()].slice(0, searchMaxLength).join('').trim()
    : ''
}
// `all` and an empty query are defaults and stay out of the URL.
export function browseSearch(
  type: CatalogType,
  q?: string,
): { type?: BrowseFilterType; q?: string } {
  const query = normalizeQuery(q)
  return {
    ...(type === 'all' ? {} : { type }),
    ...(query ? { q: query } : {}),
  }
}
export function catalogSearch(search: Record<string, unknown>) {
  return browseSearch(catalogType(search.type), normalizeQuery(search.q))
}
const apiKinds = {
  all: 'all',
  film: 'movie',
  standalone: 'standalone',
  series: 'series',
} as const
export function browseFilters(type: CatalogType, q: string): CatalogFilters {
  return { search: normalizeQuery(q), kind: apiKinds[type], genreId: 'all' }
}
export const publicVideoSchema = watchVideoSchema.refine(
  (v) => v.kind !== 'episode',
)
export type PublicVideo = z.infer<typeof publicVideoSchema>
// Longest poster URL lifetime the API may issue (SigV4 allows 7 days; the same
// bound as urlLifetimeBounds.max in apps/api/src/config/playback-env.ts).
export const posterMaxLifetimeMs = 7 * 24 * 3_600_000
export const signedPosterSchema = z
  .object({
    videoId: z.string().uuid(),
    posterUrl: z.string().url(),
    expiresAt: z.iso.datetime(),
  })
  .strict()
export type SignedPoster = z.infer<typeof signedPosterSchema>
export function durationLabel(duration: number) {
  return `${Math.ceil(duration / 60_000)} min`
}
