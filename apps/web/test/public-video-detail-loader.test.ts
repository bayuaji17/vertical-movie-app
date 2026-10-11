import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  loadVideoDetail,
  videoOptions,
} from '../src/lib/public/catalog-queries'
import { contentDetailOptions } from '../src/lib/catalog/content-queries'
import { CatalogRequestError } from '../src/lib/catalog/catalog-client'
import type { PublicVideo } from '../src/lib/public/catalog-model'

const id = '00000000-0000-4000-8000-000000000001'
const video: PublicVideo = {
  id,
  slug: 'a-film',
  title: 'A film',
  synopsis: 'Story',
  kind: 'movie',
  durationMs: 60_000,
  seasonNumber: null,
  episodeNumber: null,
  seriesSlug: null,
}
const videoApi = (read: () => Promise<unknown>) => ({ detail: read }) as never
const contentApi = (read: (kind: string, slug: string) => Promise<unknown>) =>
  ({ detail: read }) as never
const item = {
  id,
  kind: 'movie',
  slug: 'a-film',
  title: 'A film',
  synopsis: 'Story',
  publishedAt: '2026-10-01T00:00:00.123456Z',
  genres: [
    { id: '00000000-0000-4000-8000-0000000000aa', slug: 'noir', name: 'Noir' },
  ],
  posterPath: `/catalog/movie/${id}/poster`,
  poster: `/api/catalog/movie/${id}/poster`,
  durationMs: 60_000,
}

test('detail loader caches the video and its catalog detail for the page', async () => {
  const client = new QueryClient(),
    calls: string[] = []
  const result = await loadVideoDetail(client, video.slug, {
    video: videoApi(async () => ({
      item: video,
      expiresAt: Date.now() + 60_000,
    })),
    content: contentApi(async (kind, slug) => {
      calls.push(kind + ':' + slug)
      return { item, expiresAt: Date.now() + 60_000 }
    }),
  })
  expect(result).toEqual({ status: null })
  expect(calls).toEqual(['movie:a-film'])
  expect(
    client.getQueryData<{ item: unknown }>(
      contentDetailOptions('movie', video.slug).queryKey,
    )?.item,
  ).toEqual(item)
  expect(client.getQueryData(videoOptions(video.slug).queryKey)).toBeDefined()
  client.clear()
})
test('missing genres never fail the page, and a failed video skips the extra request', async () => {
  const client = new QueryClient()
  expect(
    await loadVideoDetail(client, video.slug, {
      video: videoApi(async () => ({
        item: video,
        expiresAt: Date.now() + 60_000,
      })),
      content: contentApi(async () => {
        throw new CatalogRequestError(503)
      }),
    }),
  ).toEqual({ status: null })
  let contentCalls = 0
  const other = new QueryClient()
  for (const status of [404, 422, 503])
    expect(
      await loadVideoDetail(other, 'gone-' + status, {
        video: videoApi(async () => {
          throw new CatalogRequestError(status)
        }),
        content: contentApi(async () => {
          contentCalls++
          return { item, expiresAt: Date.now() + 60_000 }
        }),
      }),
    ).toEqual({ status })
  expect(contentCalls).toBe(0)
  client.clear()
  other.clear()
})
