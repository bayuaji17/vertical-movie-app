import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { SeriesDetail } from '../src/components/public/series-detail'
import { VideoDetail } from '../src/components/public/video-detail'
import { WatchContent } from '../src/components/public/watch-content'
import {
  contentDetailOptions,
  contentEpisodesOptions,
} from '../src/lib/catalog/content-queries'
import { videoOptions } from '../src/lib/public/catalog-queries'
import type { EpisodeNav } from '../src/hooks/use-episode-nav'
import type { CatalogItem } from '../src/lib/catalog/public-catalog-model'
import type {
  PublicEpisode,
  WatchVideo,
} from '../src/lib/catalog/content-model'
import type { PublicVideo } from '../src/lib/public/catalog-model'
import { renderPublic } from './public-render'

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const genre = { id: id(900), slug: 'noir', name: 'Noir' }
const seriesItem: CatalogItem = {
  id: id(1),
  kind: 'series',
  slug: 'a-series',
  title: 'A Series',
  synopsis: 'A long story. '.repeat(20),
  publishedAt: '2026-10-01T00:00:00.123456Z',
  genres: [genre],
  posterPath: `/catalog/series/${id(1)}/poster`,
  poster: `/api/catalog/series/${id(1)}/poster`,
  episodeCount: 3,
}
const episode = (season: number, number: number): PublicEpisode => ({
  id: id(100 + season * 10 + number),
  slug: `s${season}-e${number}`,
  title: `Title ${season}.${number}`,
  synopsis: 'Episode story',
  durationMs: 120_000,
  seasonNumber: season,
  episodeNumber: number,
})
const fresh = { freshForMs: 60_000, expiresAt: Date.now() + 60_000 }
function seriesClient(
  nextCursor: string | null,
  items = [episode(1, 1), episode(1, 2), episode(2, 1)],
) {
  const client = new QueryClient()
  client.setQueryData(contentDetailOptions('series', 'a-series').queryKey, {
    item: seriesItem,
    ...fresh,
  })
  client.setQueryData(contentEpisodesOptions('a-series').queryKey, {
    pages: [{ items, total: 3, nextCursor, ...fresh }],
    pageParams: [null],
  })
  return client
}
const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '|')
    .replace(/\|+/g, '|')

test('series detail leads with Play S1 E1, a season summary and only the first season', async () => {
  const html = await renderPublic(
    <SeriesDetail
      slug="a-series"
      bootstrap={{ detailStatus: null, episodesStatus: null }}
    />,
    seriesClient(null),
  )
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(text(html)).toContain('2 seasons · 3 episodes')
  expect(text(html)).toContain('Noir')
  expect(html).toMatch(/href="\/watch\/s1-e1"[^>]*>[^]*?Play S1 E1/)
  expect(html).toContain('data-sticky-cta')
  expect(html).toContain('aria-label="Season"')
  expect(html).toContain('aria-label="Season 1 episodes"')
  expect(html).toContain('href="/watch/s1-e2"')
  expect(html).not.toContain('href="/watch/s2-e1"')
  expect(html).toContain('href="/"')
  expect(html).not.toContain('Load more episodes')
})
test('series detail does not claim a season count until every page is loaded', async () => {
  const html = await renderPublic(
    <SeriesDetail
      slug="a-series"
      bootstrap={{ detailStatus: null, episodesStatus: null }}
    />,
    seriesClient('next', [episode(1, 1), episode(1, 2)]),
  )
  expect(text(html)).toContain('3 episodes')
  expect(text(html)).not.toContain('seasons')
  expect(html).toContain('Load more episodes')
})
test('series detail shows no Play button and a clear message when there are no episodes', async () => {
  const html = await renderPublic(
    <SeriesDetail
      slug="a-series"
      bootstrap={{ detailStatus: null, episodesStatus: null }}
    />,
    seriesClient(null, []),
  )
  expect(html).not.toContain('Play S')
  expect(html).not.toContain('data-sticky-cta')
  expect(html).toContain('No episodes are currently available.')
})
test('series detail reports a missing series without leaking details', async () => {
  const html = await renderPublic(
    <SeriesDetail
      slug="gone"
      bootstrap={{ detailStatus: 404, episodesStatus: 404 }}
    />,
  )
  expect(text(html)).toContain('Series unavailable')
  expect(html).toContain('Retry series')
})
test('film detail shows genres, a sticky Watch now link and a history-aware Back', async () => {
  const video: PublicVideo = {
    id: id(5),
    slug: 'a-film',
    title: 'A Film',
    synopsis: 'Story',
    kind: 'movie',
    durationMs: 120_000,
    seasonNumber: null,
    episodeNumber: null,
    seriesSlug: null,
  }
  const client = new QueryClient()
  client.setQueryData(videoOptions('a-film').queryKey, {
    item: video,
    expiresAt: Date.now() + 60_000,
  })
  client.setQueryData(contentDetailOptions('movie', 'a-film').queryKey, {
    item: {
      id: video.id,
      kind: 'movie',
      slug: 'a-film',
      title: 'A Film',
      synopsis: 'Story',
      publishedAt: '2026-10-01T00:00:00.123456Z',
      genres: [genre],
      posterPath: `/catalog/movie/${video.id}/poster`,
      poster: `/api/catalog/movie/${video.id}/poster`,
      durationMs: 120_000,
    } satisfies CatalogItem,
    ...fresh,
  })
  const html = await renderPublic(
    <VideoDetail slug="a-film" status={null} />,
    client,
  )
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(text(html)).toContain('Film|2 min')
  expect(text(html)).toContain('Noir')
  expect(html).toContain('href="/watch/a-film"')
  expect(html).toContain('data-sticky-cta')
  expect(html).toContain('Back to browse')
})
const watching: WatchVideo = {
  id: episode(1, 2).id,
  slug: 's1-e2',
  title: 'Title 1.2',
  synopsis: 'Episode story',
  kind: 'episode',
  durationMs: 120_000,
  seasonNumber: 1,
  episodeNumber: 2,
  seriesSlug: 'a-series',
}
const nav = (patch: Partial<EpisodeNav> = {}): EpisodeNav => ({
  seriesSlug: 'a-series',
  seriesTitle: 'A Series',
  episodes: [episode(1, 1), episode(1, 2), episode(2, 1)],
  seasons: [1, 2],
  previous: episode(1, 1),
  next: episode(2, 1),
  atEnd: false,
  loading: false,
  failed: false,
  retry: () => undefined,
  ...patch,
})
test('episode watch page links the series, steps across seasons and marks the playing episode', async () => {
  const html = await renderPublic(<WatchContent video={watching} nav={nav()} />)
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(html).toContain('aria-label="Breadcrumb"')
  expect(html).toContain('href="/series/a-series"')
  expect(text(html)).toContain('A Series')
  expect(html).toContain('aria-label="Previous episode · S1 E1"')
  expect(html).toContain('aria-label="Next episode · S2 E1"')
  expect(html).toContain('href="/watch/s1-e1"')
  expect(html).toContain('href="/watch/s2-e1"')
  expect(html.match(/aria-current="page"/g)).toHaveLength(1)
  expect(html).toContain('aria-label="Episodes"')
  expect(html).not.toContain('Up next')
  expect(html).toContain('100svh-3.5rem')
  expect(html).not.toContain('autoplay')
})
test('first and last episodes disable the missing neighbor and the last one says so', async () => {
  const first = await renderPublic(
    <WatchContent
      video={{
        ...watching,
        slug: 's1-e1',
        id: episode(1, 1).id,
        episodeNumber: 1,
      }}
      nav={nav({ previous: undefined })}
    />,
  )
  expect(first).not.toContain('aria-label="Previous episode')
  expect(first).toMatch(/<button[^>]*disabled[^>]*>[^]*?Previous/)
  expect(first).toContain('aria-label="Next episode')
  const last = await renderPublic(
    <WatchContent
      video={{
        ...watching,
        slug: 's2-e1',
        id: episode(2, 1).id,
        seasonNumber: 2,
        episodeNumber: 1,
      }}
      nav={nav({ next: undefined, atEnd: true })}
    />,
  )
  expect(last).toContain('You’re all caught up.')
  expect(last).toContain('Back to series')
  expect(last).not.toContain('aria-label="Next episode')
})
test('film watch page has Details and no episode controls', async () => {
  const film: WatchVideo = {
    ...watching,
    kind: 'movie',
    seasonNumber: null,
    episodeNumber: null,
    seriesSlug: null,
    slug: 'a-film',
  }
  const html = await renderPublic(
    <WatchContent
      video={film}
      nav={nav({ seriesSlug: null, episodes: [], seasons: [] })}
    />,
  )
  expect(html).toContain('href="/videos/a-film"')
  expect(html).toContain('Details')
  expect(html).not.toContain('aria-label="Episodes"')
  expect(html).not.toContain('Previous')
})
