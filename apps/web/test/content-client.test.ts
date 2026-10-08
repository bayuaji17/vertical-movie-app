import { expect, test } from 'bun:test'
import { createPublicContentClient } from '../src/lib/catalog/content-client'
import { CatalogRequestError } from '../src/lib/catalog/catalog-client'
import {
  contentDetailOptions,
  contentEpisodesOptions,
  watchMetadataOptions,
  nextEpisodeOptions,
} from '../src/lib/catalog/content-queries'
import { QueryClient, InfiniteQueryObserver } from '@tanstack/react-query'

const id = '00000000-0000-4000-8000-000000000001',
  slug = 'a-film',
  signal = () => new AbortController().signal
const item = {
  id,
  slug,
  kind: 'movie' as const,
  title: 'Film',
  synopsis: 'Story',
  publishedAt: '2026-10-07T00:00:00.000000Z',
  genres: [],
  posterPath: `/catalog/movie/${id}/poster`,
  durationMs: 1000,
}
const video = {
  id,
  slug,
  kind: 'movie' as const,
  title: 'Film',
  synopsis: 'Story',
  durationMs: 1000,
  seasonNumber: null,
  episodeNumber: null,
  seriesSlug: null,
}
test('public typed paths, strict metadata, remaining TTL and no credentials', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const api = createPublicContentClient(
    'https://web.test/api',
    async (input, init) => {
      calls.push({ url: String(input), init })
      return Response.json(
        String(input).includes('/watch/')
          ? { item: video, freshForMs: 700 }
          : { item, freshForMs: 1000 },
      )
    },
    () => 100,
  )
  expect((await api.detail('movie', slug, signal())).expiresAt).toBe(1100)
  expect((await api.watch(slug, signal())).item).toEqual(video)
  expect(calls[0]?.url).toBe(
    'https://web.test/api/catalog/details/movie/a-film',
  )
  expect(calls[1]?.url).toBe('https://web.test/api/catalog/watch/a-film')
  expect(
    calls.every(
      (c) =>
        c.init?.credentials === 'omit' &&
        c.init.cache === 'no-store' &&
        c.init.redirect === 'error',
    ),
  ).toBe(true)
  const malformed = createPublicContentClient(
    'https://web.test/api',
    async () =>
      Response.json({
        item: { ...item, masterUrl: 'private' },
        freshForMs: 1000,
      }),
  )
  await expect(malformed.detail('movie', slug, signal())).rejects.toMatchObject(
    { status: 502 },
  )
  await expect(api.detail('movie', 'Bad/slug', signal())).rejects.toMatchObject(
    { status: 422 },
  )
})
test('episodes are server cursors with null EOF; 404 alone means no next', async () => {
  const calls: string[] = []
  const api = createPublicContentClient(
    'https://web.test/api',
    async (input) => {
      calls.push(String(input))
      return String(input).includes('/next')
        ? new Response(null, { status: 404 })
        : Response.json({
            items: [],
            total: 0,
            nextCursor: null,
            freshForMs: 1000,
          })
    },
  )
  expect(
    (await api.episodes('a-series', 'opaque-cursor', signal())).nextCursor,
  ).toBeNull()
  expect(new URL(calls[0]).searchParams.get('cursor')).toBe('opaque-cursor')
  expect(new URL(calls[0]).searchParams.get('limit')).toBe('20')
  expect(await api.next('episode-1', signal())).toBeNull()
  const outage = createPublicContentClient('https://web.test/api', async () =>
    Response.json({ error: {} }, { status: 503 }),
  )
  await expect(outage.next('episode-1', signal())).rejects.toMatchObject({
    status: 503,
  })
})
test('query traversal keeps failed pages, retries same cursor and does not touch private cache', async () => {
  const client = new QueryClient(),
    calls: Array<string | null> = []
  let fail = false
  const api = {
    episodes: async (_slug: string, cursor: string | null) => {
      calls.push(cursor)
      if (fail) throw new CatalogRequestError(503)
      return {
        items: [],
        total: 21,
        nextCursor: cursor ? null : 'cursor1',
        freshForMs: 60000,
        expiresAt: Date.now() + 60000,
      }
    },
  }
  const options = contentEpisodesOptions('a-series', api),
    observer = new InfiniteQueryObserver(client, options)
  const unsubscribe = observer.subscribe(() => {})
  try {
    client.setQueryData(['admin', 'private'], { unchanged: true })
    await observer.refetch()
    fail = true
    await observer.fetchNextPage()
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(true)
    expect(observer.getCurrentResult().data?.pages).toHaveLength(1)
    fail = false
    await observer.fetchNextPage()
    expect(calls.slice(-2)).toEqual(['cursor1', 'cursor1'])
    expect(observer.getCurrentResult().data?.pages).toHaveLength(2)
    expect(
      client.getQueryData<{ unchanged: boolean }>(['admin', 'private']),
    ).toEqual({
      unchanged: true,
    })
    expect(contentDetailOptions('movie', slug).queryKey).not.toEqual(
      contentDetailOptions('standalone', slug).queryKey,
    )
    expect(watchMetadataOptions(slug).queryKey).not.toEqual(options.queryKey)
  } finally {
    unsubscribe()
    observer.destroy()
    client.clear()
  }
})
test('Next rejects backwards ordering instead of navigating', async () => {
  const client = new QueryClient()
  try {
    const options = nextEpisodeOptions('episode-1', 'a-series', 2, 3, {
      next: async () => ({
        ...video,
        slug: 'episode-2',
        kind: 'episode',
        seasonNumber: 1,
        episodeNumber: 4,
        seriesSlug: 'a-series',
      }),
    })
    await expect(client.query(options)).rejects.toMatchObject({ status: 502 })
  } finally {
    client.clear()
  }
})
test('playback validates identity, same-origin master and lifetime; signed payload stays separate', async () => {
  const info = {
    videoId: id,
    title: 'Film',
    durationMs: 1000,
    masterUrl: `https://web.test/api/playback/videos/${slug}/master.m3u8`,
    posterUrl: 'https://storage.test/output.webp?signature=fixture',
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  }
  const api = createPublicContentClient('https://web.test/api', async () =>
    Response.json(info),
  )
  expect(await api.playback(slug, id, signal())).toEqual(info)
  await expect(
    api.playback(slug, '00000000-0000-4000-8000-000000000002', signal()),
  ).rejects.toMatchObject({ status: 502 })
  const external = createPublicContentClient('https://web.test/api', async () =>
    Response.json({
      ...info,
      masterUrl: 'https://other.test/api/playback/videos/a-film/master.m3u8',
    }),
  )
  await expect(external.playback(slug, id, signal())).rejects.toMatchObject({
    status: 502,
  })
})
test('abort propagates to transport and rejects late completions', async () => {
  const controller = new AbortController()
  let release!: () => void, started!: () => void
  const ready = new Promise<void>((r) => {
    started = r
  })
  const api = createPublicContentClient(
    'https://web.test/api',
    async (_input, init) => {
      started()
      await new Promise<void>((r) => {
        release = r
      })
      expect(init?.signal?.aborted).toBe(true)
      return Response.json({ item, freshForMs: 1000 })
    },
  )
  const read = api.detail('movie', slug, controller.signal)
  await ready
  controller.abort()
  release()
  await expect(read).rejects.toBeDefined()
})
