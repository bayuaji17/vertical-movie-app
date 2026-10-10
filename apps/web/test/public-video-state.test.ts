import { expect, test } from 'bun:test'
import { QueryClient, dehydrate } from '@tanstack/react-query'
import { PosterQueue } from '../src/lib/public/poster-state'
import type { PublicVideo, SignedPoster } from '../src/lib/public/catalog-model'

const video = (n: number): PublicVideo => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  slug: `film-${n}`,
  title: 'Film',
  synopsis: 'Story',
  kind: 'movie',
  durationMs: 60_000,
  seasonNumber: null,
  episodeNumber: null,
  seriesSlug: null,
})
const packet = (n: number, expiry = Date.now() + 100_000): SignedPoster => ({
  videoId: video(n).id,
  posterUrl: 'http://storage.test/poster.webp?signature=fixture',
  expiresAt: new Date(expiry).toISOString(),
})

test('visible poster queue bounds four requests, deduplicates consumers, cancels offscreen work and does not persist capabilities', async () => {
  let active = 0,
    maximum = 0,
    clock = 0,
    reads = 0
  const releases = new Map<number, () => void>()
  const queue = new PosterQueue(
    async (v, signal) => {
      const n = Number(v.slug.slice(5))
      reads++
      active++
      maximum = Math.max(maximum, active)
      try {
        await new Promise<void>((r) => {
          releases.set(n, r)
          signal.addEventListener('abort', () => r(), { once: true })
        })
        signal.throwIfAborted()
        return packet(n, 1000)
      } finally {
        active--
      }
    },
    () => clock,
  )
  const controllers = Array.from({ length: 6 }, () => new AbortController())
  const requests = controllers.map((c, n) =>
    queue.request(video(n + 1), c.signal).catch(() => null),
  )
  const duplicateController = new AbortController()
  const duplicate = queue.request(video(1), duplicateController.signal)
  expect(reads).toBe(4)
  controllers[0].abort()
  expect(active).toBe(4)
  controllers[5].abort()
  releases.get(1)!()
  await duplicate
  await Promise.resolve()
  expect(reads).toBe(5)
  expect(releases.has(6)).toBe(false)
  for (const n of [2, 3, 4, 5]) releases.get(n)!()
  await Promise.all(requests)
  expect(maximum).toBe(4)
  await queue.request(video(2), new AbortController().signal)
  expect(reads).toBe(5)
  clock = 1000
  const renewed = queue.request(video(2), new AbortController().signal)
  expect(reads).toBe(6)
  releases.get(2)!()
  await expect(renewed).rejects.toThrow('Poster expired')
  const client = new QueryClient()
  expect(JSON.stringify(dehydrate(client))).not.toContain('signature')
  client.clear()
})
