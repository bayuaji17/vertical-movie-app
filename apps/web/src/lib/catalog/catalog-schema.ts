import { z } from 'zod'

const identity = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const common = {
  id: identity,
  slug: identity,
  title: z.string().trim().min(1),
  synopsis: z.string().trim().min(1),
  genreIds: z.array(identity).min(1),
  poster: z.string().regex(/^\/images\/catalog\/[a-z0-9-]+\.png$/),
  publishedAt: z.iso.datetime(),
}
const videoFields = { durationMs: z.number().int().positive() }
export const CatalogItemSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...common, kind: z.literal('movie'), ...videoFields }),
  z.strictObject({ ...common, kind: z.literal('standalone'), ...videoFields }),
  z.strictObject({
    ...common,
    kind: z.literal('series'),
    episodeCount: z.number().int().positive(),
  }),
])
export const CatalogDataSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    featuredId: identity,
    genres: z.array(z.strictObject({ id: identity, label: z.string().min(1) })),
    items: z.array(CatalogItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const unique = (values: Array<string>, field: string) => {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', message: `Duplicate ${field}` })
    }
    unique(
      data.items.map((item) => item.id),
      'id',
    )
    unique(
      data.items.map((item) => item.slug),
      'slug',
    )
    unique(
      data.genres.map((genre) => genre.id),
      'genre',
    )
    const genres = new Set(data.genres.map((genre) => genre.id))
    for (const item of data.items) {
      unique(item.genreIds, 'item genre')
      if (item.genreIds.some((id) => !genres.has(id)))
        ctx.addIssue({ code: 'custom', message: 'Unknown genre' })
    }
    if (
      !data.items.some(
        (item) => item.id === data.featuredId && item.kind === 'movie',
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Featured item must be a film' })
  })
export type CatalogItem = z.infer<typeof CatalogItemSchema>
export type CatalogData = z.infer<typeof CatalogDataSchema>
