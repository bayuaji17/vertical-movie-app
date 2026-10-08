import type { ZodType } from 'zod'
import { createApiClient } from '../api/client'
import type { ApiFetcher } from '../api/client'
import { CatalogRequestError } from '../catalog/catalog-client'
import { contentSlug, watchVideoSchema } from '../catalog/content-model'
import {
  catalogKinds,
  catalogPageSize,
  catalogType,
  publicVideoPageSchema,
  signedPosterSchema,
} from './catalog-model'
import type { CatalogType, PublicVideo } from './catalog-model'

export function createPublicVideoClient(
  base: string,
  fetcher: ApiFetcher = fetch,
  now = () => Date.now(),
) {
  const client = createApiClient(base, (input, init) =>
    fetcher(input, {
      ...init,
      headers: { accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        AbortSignal.timeout(10_000),
      ]),
    }),
  )
  function check<T>(
    r: { data: unknown; error: unknown; status: number },
    schema: ZodType<T>,
    signal: AbortSignal,
  ): T {
    signal.throwIfAborted()
    if (r.error || r.status < 200 || r.status >= 300)
      throw new CatalogRequestError(r.status)
    const parsed = schema.safeParse(r.data)
    if (!parsed.success) throw new CatalogRequestError(502)
    return parsed.data
  }
  function slug(value: string) {
    if (!contentSlug.safeParse(value).success)
      throw new CatalogRequestError(422)
  }
  async function page(
    type: CatalogType,
    cursor: string | null,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted()
    const normalized = catalogType(type)
    const r = await client.videos.get({
      query: {
        limit: String(catalogPageSize),
        kinds: catalogKinds[normalized],
        ...(cursor ? { cursor } : {}),
      },
      fetch: { signal },
    })
    const data = check(r, publicVideoPageSchema, signal)
    if (
      data.items.some((v) =>
        normalized === 'film'
          ? v.kind !== 'movie'
          : normalized === 'standalone' && v.kind !== 'standalone',
      )
    )
      throw new CatalogRequestError(502)
    return { ...data, expiresAt: now() + 60_000 }
  }
  async function detail(value: string, signal: AbortSignal) {
    slug(value)
    signal.throwIfAborted()
    const r = await client.videos({ slug: value }).get({ fetch: { signal } })
    // Individual episodes retain their direct watch route, but have no Film/Standalone detail page.
    const item = check(r, watchVideoSchema, signal)
    if (item.kind === 'episode') throw new CatalogRequestError(404)
    if (item.slug !== value) throw new CatalogRequestError(502)
    return { item, expiresAt: now() + 60_000 }
  }
  async function poster(video: PublicVideo, signal: AbortSignal) {
    slug(video.slug)
    signal.throwIfAborted()
    const r = await client
      .videos({ slug: video.slug })
      .poster.get({ fetch: { signal } })
    const data = check(r, signedPosterSchema, signal)
    const url = new URL(data.posterUrl),
      expiry = Date.parse(data.expiresAt)
    if (
      data.videoId !== video.id ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.hash ||
      !url.pathname.endsWith('/poster.webp') ||
      expiry <= now() ||
      expiry > now() + Math.ceil((video.durationMs * 2) / 1000) * 1000 + 30_000
    )
      throw new CatalogRequestError(502)
    return data
  }
  return { page, detail, poster }
}
export type PublicVideoClient = ReturnType<typeof createPublicVideoClient>
export type PublicVideoPage = Awaited<ReturnType<PublicVideoClient['page']>>
export type PublicVideoDetail = Awaited<ReturnType<PublicVideoClient['detail']>>
