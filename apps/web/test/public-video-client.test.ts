import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { createPublicVideoClient } from '../src/lib/public/catalog-client'
import { CatalogRequestError } from '../src/lib/catalog/catalog-client'
import { catalogSearch } from '../src/lib/public/catalog-model'
import type { PublicVideo } from '../src/lib/public/catalog-model'

const video: PublicVideo = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'a-film',
  title: 'A Film',
  synopsis: 'Story',
  kind: 'movie',
  durationMs: 60_000,
  seasonNumber: null,
  episodeNumber: null,
  seriesSlug: null,
}
const signal = () => new AbortController().signal
test('public video transport canonicalizes URL filter/cursor, strips credentials and keeps metadata unsigned', async () => {
  const requests: Request[] = []
  const api = createPublicVideoClient(
    'http://web.test/api',
    async (input, init) => {
      expect(init?.credentials).toBe('omit')
      expect(init?.cache).toBe('no-store')
      expect(init?.redirect).toBe('error')
      const request = new Request(input, init)
      requests.push(request)
      expect(request.headers.has('cookie')).toBe(false)
      expect(request.headers.has('authorization')).toBe(false)
      return Response.json(
        new URL(request.url).pathname.endsWith('/a-film')
          ? video
          : { items: [video], nextCursor: 'next' },
      )
    },
    () => 100,
  )
  const page = await api.page('all', null, signal())
  expect(page.expiresAt).toBe(60_100)
  expect(new URL(requests[0].url).searchParams.get('kinds')).toBe(
    'movie,standalone',
  )
  expect(new URL(requests[0].url).searchParams.get('limit')).toBe('20')
  await api.page('film', 'next', signal())
  expect(new URL(requests[1].url).searchParams.get('kinds')).toBe('movie')
  expect(new URL(requests[1].url).searchParams.get('cursor')).toBe('next')
  expect((await api.detail(video.slug, signal())).item).toEqual(video)
  expect(JSON.stringify(page)).not.toMatch(
    /posterUrl|masterUrl|Signature|sourceKey/,
  )
  expect(catalogSearch({ type: 'series', host: 'attacker' })).toEqual({
    type: 'all',
  })
})
test('public failures and malformed DTOs never become empty pages or clear admin state', async () => {
  const query = new QueryClient()
  query.setQueryData(['admin', 'sentinel'], 'keep')
  for (const status of [401, 403, 404, 503]) {
    const api = createPublicVideoClient('http://web.test/api', async () =>
      Response.json({ error: 'private diagnostics' }, { status }),
    )
    await expect(api.page('all', null, signal())).rejects.toMatchObject({
      status,
    })
  }
  for (const body of [
    { items: [], nextCursor: null, sourceKey: 'private' },
    { items: [{ ...video, kind: 'episode' }], nextCursor: null },
    { items: [video], nextCursor: null, posterUrl: 'signed' },
    { items: [{ ...video, durationMs: 0 }], nextCursor: null },
  ])
    await expect(
      createPublicVideoClient('http://web.test/api', async () =>
        Response.json(body),
      ).page('all', null, signal()),
    ).rejects.toMatchObject({ status: 502 })
  await expect(
    createPublicVideoClient('http://web.test/api', async () =>
      Response.json({
        ...video,
        kind: 'episode',
        seasonNumber: 1,
        episodeNumber: 1,
        seriesSlug: 'a-series',
      }),
    ).detail(video.slug, signal()),
  ).rejects.toMatchObject({ status: 404 })
  expect(query.getQueryData<string>(['admin', 'sentinel'])).toBe('keep')
  query.clear()
})
test('pre-aborted signals and invalid slugs stop before I/O; late aborted data cannot return success', async () => {
  let reads = 0
  const controller = new AbortController()
  const api = createPublicVideoClient('http://web.test/api', async () => {
    reads++
    controller.abort()
    return Response.json({ items: [], nextCursor: null })
  })
  await expect(api.detail('Bad/slug', signal())).rejects.toBeInstanceOf(
    CatalogRequestError,
  )
  expect(reads).toBe(0)
  await expect(api.page('all', null, controller.signal)).rejects.toThrow()
  expect(reads).toBe(1)
  await expect(api.page('all', null, controller.signal)).rejects.toThrow()
  expect(reads).toBe(1)
})
test('signed poster requires matching identity, safe WebP URL and bounded future expiry', async () => {
  const now = Date.parse('2026-10-08T00:00:00.000Z')
  const poster = {
    videoId: video.id,
    posterUrl:
      'http://storage.test/outputs/fixture/poster.webp?signature=fixture',
    expiresAt: new Date(now + 120_000).toISOString(),
  }
  const api = (value: unknown) =>
    createPublicVideoClient(
      'http://web.test/api',
      async () => Response.json(value),
      () => now,
    )
  expect(await api(poster).poster(video, signal())).toEqual(poster)
  for (const value of [
    { ...poster, videoId: '00000000-0000-4000-8000-000000000002' },
    { ...poster, posterUrl: 'https://user:password@storage.test/poster.webp' },
    { ...poster, posterUrl: 'https://storage.test/master.m3u8' },
    { ...poster, expiresAt: new Date(now).toISOString() },
    { ...poster, expiresAt: new Date(now + 3_600_000).toISOString() },
    { ...poster, masterUrl: '/hls' },
  ])
    await expect(api(value).poster(video, signal())).rejects.toMatchObject({
      status: 502,
    })
})
