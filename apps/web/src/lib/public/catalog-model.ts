import { z } from 'zod'
import { watchVideoSchema } from '../catalog/content-model'

export type CatalogType = 'all' | 'film' | 'standalone'
export const catalogTypes = ['all', 'film', 'standalone'] as const
export function catalogType(value: unknown): CatalogType {
  return value === 'film' || value === 'standalone' ? value : 'all'
}
// `all` is the default and stays out of the URL.
export function browseSearch(type: CatalogType): {
  type?: 'film' | 'standalone'
} {
  return type === 'all' ? {} : { type }
}
export function catalogSearch(search: Record<string, unknown>) {
  return browseSearch(catalogType(search.type))
}
export const catalogPageSize = 20
export const catalogKinds = {
  all: 'movie,standalone',
  film: 'movie',
  standalone: 'standalone',
} as const
export const publicVideoSchema = watchVideoSchema.refine(
  (v) => v.kind !== 'episode',
)
export type PublicVideo = z.infer<typeof publicVideoSchema>
export const publicVideoPageSchema = z
  .object({
    items: z.array(publicVideoSchema).max(catalogPageSize),
    nextCursor: z.string().min(1).max(2048).nullable(),
  })
  .strict()
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
