import { expect, test } from 'bun:test'
import {
  watchBackTarget,
  watchHeadline,
  watchKindLabel,
} from '../src/lib/catalog/watch-model'
import type { WatchVideo } from '../src/lib/catalog/content-model'

const base = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'a-video',
  title: 'A video',
  synopsis: 'Story',
  durationMs: 60_000,
}
const film: WatchVideo = {
  ...base,
  kind: 'movie',
  seasonNumber: null,
  episodeNumber: null,
  seriesSlug: null,
}
const episode: WatchVideo = {
  ...base,
  kind: 'episode',
  seasonNumber: 1,
  episodeNumber: 3,
  seriesSlug: 'a-series',
}

test('top bar title leads episodes with their position', () => {
  expect(watchHeadline(film)).toBe('A video')
  expect(watchHeadline({ ...film, kind: 'standalone' })).toBe('A video')
  expect(watchHeadline(episode)).toBe('S1 E3 · A video')
})
test('Back goes to the series, the film details or Browse', () => {
  expect(watchBackTarget(episode)).toEqual({ to: 'series', slug: 'a-series' })
  expect(watchBackTarget(film)).toEqual({ to: 'video', slug: 'a-video' })
  expect(watchBackTarget({ ...film, kind: 'standalone' })).toEqual({
    to: 'video',
    slug: 'a-video',
  })
  expect(watchBackTarget({ ...episode, seriesSlug: null })).toEqual({
    to: 'home',
  })
  expect(watchBackTarget(undefined)).toEqual({ to: 'home' })
})
test('kind labels cover every watchable kind', () => {
  expect(Object.keys(watchKindLabel).sort()).toEqual([
    'episode',
    'movie',
    'standalone',
  ])
})
