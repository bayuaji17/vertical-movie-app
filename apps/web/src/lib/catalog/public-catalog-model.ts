import { z } from 'zod'

const uuid = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)
export const publicGenreSchema = z
  .object({ id: uuid, slug: z.string(), name: z.string() })
  .strict()
const common = {
  id: uuid,
  slug: z.string(),
  title: z.string().min(1),
  synopsis: z.string().min(1),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/)
    .refine((v) => Number.isFinite(Date.parse(v))),
  genres: z.array(publicGenreSchema),
  posterPath: z.string(),
}
const duration = z.number().int().min(1).max(1_800_000)
export const publicItemSchema = z
  .discriminatedUnion('kind', [
    z
      .object({ ...common, kind: z.literal('movie'), durationMs: duration })
      .strict(),
    z
      .object({
        ...common,
        kind: z.literal('standalone'),
        durationMs: duration,
      })
      .strict(),
    z
      .object({
        ...common,
        kind: z.literal('series'),
        episodeCount: z.number().int().min(1),
      })
      .strict(),
  ])
  .refine((v) => v.posterPath === `/catalog/${v.kind}/${v.id}/poster`)
const freshness = z.number().int().min(0).max(60_000)
const cursor = z.string().min(1).max(2048).nullable()
export const publicPageSchema = z
  .object({
    items: z.array(publicItemSchema),
    total: z.number().int().min(0),
    nextCursor: cursor,
    freshForMs: freshness,
  })
  .strict()
export const publicGenresSchema = z
  .object({
    items: z.array(publicGenreSchema),
    nextCursor: cursor,
    freshForMs: freshness,
  })
  .strict()
export const publicFeaturedSchema = z
  .object({
    item: publicItemSchema.refine((v) => v.kind === 'movie').nullable(),
    freshForMs: freshness,
  })
  .strict()
export type PublicGenre = z.infer<typeof publicGenreSchema>
export type CatalogItem = z.infer<typeof publicItemSchema> & { poster: string }
export type CatalogFilters = {
  search: string
  kind: CatalogItem['kind'] | 'all'
  genreId: string
}
export const defaultCatalogFilters: CatalogFilters = {
  search: '',
  kind: 'all',
  genreId: 'all',
}
export const catalogPageSize = 6
export const catalogSort = 'publishedAt-desc_id-asc_kind-asc'
export function normalizeFilters(filters: CatalogFilters) {
  return { ...filters, search: filters.search.trim().toLowerCase() }
}
export function sameFilters(a: CatalogFilters, b: CatalogFilters) {
  const left = normalizeFilters(a),
    right = normalizeFilters(b)
  return (
    left.search === right.search &&
    left.kind === right.kind &&
    left.genreId === right.genreId
  )
}
export function publicItem(
  item: z.infer<typeof publicItemSchema>,
): CatalogItem {
  return { ...item, poster: '/api' + item.posterPath }
}
export function itemIdentity(item: CatalogItem) {
  return `${item.kind}:${item.id}`
}
export const kindLabels = {
  movie: 'Film',
  series: 'Series',
  standalone: 'Standalone',
} as const
export function itemLength(item: CatalogItem) {
  return item.kind === 'series'
    ? `${item.episodeCount} episodes`
    : `${Math.ceil(item.durationMs / 60_000)} min`
}
export function genreLabels(item: CatalogItem) {
  return item.genres.map((v) => v.name).join(' · ')
}
