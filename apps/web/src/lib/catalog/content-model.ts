import { z } from 'zod'
import { publicItemSchema, publicItem } from './public-catalog-model'

export const contentSlug = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
export const contentKind = z.enum(['movie', 'standalone', 'series'])
const uuid = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)
const duration = z.number().int().min(1).max(1_800_000)
const positive = z.number().int().positive()
const freshness = z.number().int().min(0).max(60_000)
export const contentDetailSchema = z
  .object({ item: publicItemSchema, freshForMs: freshness })
  .strict()
export const episodeSchema = z
  .object({
    id: uuid,
    slug: contentSlug,
    title: z.string().min(1),
    synopsis: z.string().min(1),
    durationMs: duration,
    seasonNumber: positive,
    episodeNumber: positive,
  })
  .strict()
export const episodePageSchema = z
  .object({
    items: z.array(episodeSchema),
    total: z.number().int().min(0),
    nextCursor: z.string().min(1).max(2048).nullable(),
    freshForMs: freshness,
  })
  .strict()
export const watchVideoSchema = z
  .object({
    id: uuid,
    slug: contentSlug,
    title: z.string().min(1),
    synopsis: z.string().min(1),
    kind: z.enum(['movie', 'standalone', 'episode']),
    durationMs: duration,
    seasonNumber: positive.nullable(),
    episodeNumber: positive.nullable(),
    seriesSlug: contentSlug.nullable(),
  })
  .strict()
  .refine((v) =>
    v.kind === 'episode'
      ? v.seasonNumber !== null &&
        v.episodeNumber !== null &&
        v.seriesSlug !== null
      : v.seasonNumber === null &&
        v.episodeNumber === null &&
        v.seriesSlug === null,
  )
export const watchMetadataSchema = z
  .object({ item: watchVideoSchema, freshForMs: freshness })
  .strict()
export const playbackInfoSchema = z
  .object({
    videoId: uuid,
    title: z.string().min(1),
    durationMs: duration,
    masterUrl: z.string(),
    posterUrl: z.string(),
    expiresAt: z.string().refine((v) => Number.isFinite(Date.parse(v))),
  })
  .strict()
export type ContentKind = z.infer<typeof contentKind>
export type PublicEpisode = z.infer<typeof episodeSchema>
export type WatchVideo = z.infer<typeof watchVideoSchema>
export { publicItem }
