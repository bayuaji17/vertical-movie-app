import type { ZodType } from 'zod'
import { createApiClient } from '../api/client'
import type { ApiFetcher } from '../api/client'
import { CatalogRequestError } from './catalog-client'
import {
  contentSlug,
  contentKind,
  contentDetailSchema,
  episodePageSchema,
  watchMetadataSchema,
  watchVideoSchema,
  playbackInfoSchema,
  publicItem,
} from './content-model'
import type { ContentKind } from './content-model'

export function createPublicContentClient(
  base: string,
  fetcher: ApiFetcher = fetch,
  now = () => Date.now(),
) {
  const client = createApiClient(base, (input, init) =>
    fetcher(input, {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        AbortSignal.timeout(10_000),
      ]),
    }),
  )
  const validSlug = (slug: string) => {
    if (!contentSlug.safeParse(slug).success) throw new CatalogRequestError(422)
  }
  const check = <T>(
    result: { data: unknown; error: unknown; status: number },
    schema: ZodType<T>,
    signal: AbortSignal,
  ): T => {
    signal.throwIfAborted()
    if (result.error) throw new CatalogRequestError(result.status)
    const p = schema.safeParse(result.data)
    if (!p.success) throw new CatalogRequestError(502)
    return p.data
  }
  async function detail(kind: ContentKind, slug: string, signal: AbortSignal) {
    validSlug(slug)
    if (!contentKind.safeParse(kind).success) throw new CatalogRequestError(422)
    signal.throwIfAborted()
    const r = await client.catalog
      .details({ kind })({ slug })
      .get({ fetch: { signal } })
    const p = check(r, contentDetailSchema, signal)
    if (p.item.kind !== kind || p.item.slug !== slug)
      throw new CatalogRequestError(502)
    return { ...p, item: publicItem(p.item), expiresAt: now() + p.freshForMs }
  }
  async function episodes(
    slug: string,
    cursor: string | null,
    signal: AbortSignal,
  ) {
    validSlug(slug)
    signal.throwIfAborted()
    const r = await client.catalog.series({ slug }).episodes.get({
      query: { limit: '20', ...(cursor ? { cursor } : {}) },
      fetch: { signal },
    })
    const p = check(r, episodePageSchema, signal)
    return { ...p, expiresAt: now() + p.freshForMs }
  }
  async function watch(slug: string, signal: AbortSignal) {
    validSlug(slug)
    signal.throwIfAborted()
    const r = await client.catalog.watch({ slug }).get({ fetch: { signal } })
    const p = check(r, watchMetadataSchema, signal)
    if (p.item.slug !== slug) throw new CatalogRequestError(502)
    return { ...p, expiresAt: now() + p.freshForMs }
  }
  async function next(slug: string, signal: AbortSignal) {
    validSlug(slug)
    signal.throwIfAborted()
    const r = await client.videos({ slug }).next.get({ fetch: { signal } })
    signal.throwIfAborted()
    if (r.status === 404) return null
    const p = check(r, watchVideoSchema, signal)
    if (p.kind !== 'episode' || p.slug === slug)
      throw new CatalogRequestError(502)
    return p
  }
  async function playback(
    slug: string,
    expectedId: string,
    signal: AbortSignal,
  ) {
    validSlug(slug)
    signal.throwIfAborted()
    const r = await client.videos({ slug }).playback.get({ fetch: { signal } }),
      p = check(r, playbackInfoSchema, signal)
    let master: URL, poster: URL
    try {
      master = new URL(p.masterUrl)
      poster = new URL(p.posterUrl)
    } catch {
      throw new CatalogRequestError(502)
    }
    if (
      p.videoId !== expectedId ||
      Date.parse(p.expiresAt) <= now() ||
      master.origin !== new URL(base).origin ||
      master.pathname !== `/api/playback/videos/${slug}/master.m3u8` ||
      master.search ||
      master.hash ||
      master.username ||
      master.password ||
      !['http:', 'https:'].includes(poster.protocol) ||
      poster.username ||
      poster.password ||
      poster.hash
    )
      throw new CatalogRequestError(502)
    return p
  }
  return { detail, episodes, watch, next, playback }
}
export type PublicContentClient = ReturnType<typeof createPublicContentClient>
