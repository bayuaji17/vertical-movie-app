import { expect, test } from 'bun:test'
import { BrowseCard } from '../src/components/public/browse-card'
import { BrowseSearch } from '../src/components/public/browse-search'
import { EpisodeRow } from '../src/components/public/episode-row'
import { EpisodePanel } from '../src/components/public/episode-panel'
import { WatchShell } from '../src/components/public/watch-shell'
import { DetailSkeleton } from '../src/components/public/detail-layout'
import { Skeleton } from '../src/components/ui/skeleton'
import type { EpisodeNav } from '../src/hooks/use-episode-nav'
import type { CatalogItem } from '../src/lib/catalog/public-catalog-model'
import type {
  PublicEpisode,
  WatchVideo,
} from '../src/lib/catalog/content-model'
import { interactive, renderPublic } from './public-render'

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const film: CatalogItem = {
  id: id(1),
  kind: 'movie',
  slug: 'a-film',
  title: 'A Film',
  synopsis: 'Story',
  publishedAt: '2026-10-01T00:00:00.123456Z',
  genres: [],
  posterPath: `/catalog/movie/${id(1)}/poster`,
  poster: `/api/catalog/movie/${id(1)}/poster`,
  durationMs: 120_000,
}
const series: CatalogItem = {
  id: id(2),
  kind: 'series',
  slug: 'a-series',
  title: 'A Series',
  synopsis: 'Story',
  publishedAt: '2026-10-01T00:00:00.123456Z',
  genres: [],
  posterPath: `/catalog/series/${id(2)}/poster`,
  poster: `/api/catalog/series/${id(2)}/poster`,
  episodeCount: 1,
}
const episode = (season: number, number: number): PublicEpisode => ({
  id: id(100 + season * 10 + number),
  slug: `s${season}-e${number}`,
  title: `Title ${season}.${number}`,
  synopsis: 'Story',
  durationMs: 60_000,
  seasonNumber: season,
  episodeNumber: number,
})
const watching: WatchVideo = {
  id: episode(1, 2).id,
  slug: 's1-e2',
  title: 'Title 1.2',
  synopsis: 'Story',
  kind: 'episode',
  durationMs: 60_000,
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

test('Browse cards are one named link; the cover is decorative and targets are 44 px', async () => {
  const movie = await renderPublic(<BrowseCard item={film} />)
  expect(movie).toContain('href="/videos/a-film"')
  expect(movie.match(/<a /g)).toHaveLength(1)
  expect(movie.match(/<h2/g)).toHaveLength(1)
  expect(movie).toContain('alt=""')
  expect(movie).not.toContain('Poster for')
  expect(movie).toContain('min-h-11')
  const show = await renderPublic(<BrowseCard item={series} />)
  expect(show).toContain('href="/series/a-series"')
  expect(show).toContain('Series')
  expect(show).toContain('1 episode')
})
test('search is a labelled search landmark; Clear only exists when there is text to clear', async () => {
  const props = {
    pending: false,
    disabled: false,
    onChange: () => undefined,
    onCompositionStart: () => undefined,
    onCompositionEnd: () => undefined,
    onClear: () => undefined,
  }
  const empty = await renderPublic(<BrowseSearch value="" {...props} />)
  expect(empty).toContain('role="search"')
  expect(empty).toContain('aria-label="Search videos"')
  expect(empty).toContain('type="search"')
  expect(empty).toContain('maxLength="200"')
  expect(empty).not.toContain('Clear search')
  const filled = await renderPublic(<BrowseSearch value="night" {...props} />)
  expect(filled).toContain('aria-label="Clear search"')
  expect(filled).toContain('value="night"')
  const offline = await renderPublic(
    <BrowseSearch value="night" {...props} disabled />,
  )
  expect(offline).toContain('disabled')
  expect(offline).not.toContain('Clear search')
  const busy = await renderPublic(<BrowseSearch value="n" {...props} pending />)
  expect(busy).toMatch(
    /aria-hidden="true"[^>]*animate-spin motion-reduce:animate-none/,
  )
})
test('episode rows name season and episode and mark only the current one', async () => {
  const current = await renderPublic(
    <ul>
      <EpisodeRow episode={episode(1, 2)} current />
      <EpisodeRow episode={episode(2, 1)} />
    </ul>,
  )
  expect(current.match(/aria-current="true"/g)).toHaveLength(1)
  expect(current).toContain('href="/watch/s1-e2"')
  expect(current).toContain('Season 1, episode 2: ')
  expect(current).toContain('Season 2, episode 1: ')
  for (const tag of interactive(current)) expect(tag).toContain('min-h-11')
})
test('episode panel offers a season select only for several seasons and exposes errors with Retry', async () => {
  const many = await renderPublic(<EpisodePanel nav={nav()} video={watching} />)
  expect(many).toContain('aria-label="Season"')
  expect(many).toContain('aria-label="Season 1 episodes"')
  expect(many.match(/aria-current="true"/g)).toHaveLength(1)
  expect(many).not.toContain('s2-e1')
  const single = await renderPublic(
    <EpisodePanel
      nav={nav({ seasons: [1], episodes: [episode(1, 1), episode(1, 2)] })}
      video={watching}
    />,
  )
  expect(single).not.toContain('aria-label="Season"')
  const failed = await renderPublic(
    <EpisodePanel nav={nav({ failed: true })} video={watching} />,
  )
  expect(failed).toContain('Episodes are temporarily unavailable.')
  expect(failed).toContain('Retry episodes')
  expect(failed).not.toContain('aria-current')
  const loading = await renderPublic(
    <EpisodePanel
      nav={nav({ loading: true, episodes: [], seasons: [] })}
      video={watching}
    />,
  )
  expect(loading).toContain('aria-label="Loading episodes"')
  expect(loading).toContain('role="status"')
})
test('watch shell keeps skip link, slim banner, focusable main and a named Back control', async () => {
  const targets = [
    [
      { to: 'series', slug: 'a-series' } as const,
      'Back to series',
      '/series/a-series',
    ],
    [
      { to: 'video', slug: 'a-film' } as const,
      'Back to details',
      '/videos/a-film',
    ],
    [{ to: 'home' } as const, 'Back to browse', 'href="/"'],
  ] as const
  for (const [back, label, href] of targets) {
    const html = await renderPublic(
      <WatchShell title="A Series · S1 E2" back={back}>
        <h1>Title</h1>
      </WatchShell>,
    )
    expect(html).toContain(`aria-label="${label}"`)
    expect(html).toContain(href)
    expect(html).toContain('A Series · S1 E2')
    expect(html).toContain('id="main-content"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('h-14')
    expect(html.indexOf('Skip to content')).toBeLessThan(
      html.indexOf('<header'),
    )
    expect(html.match(/<h1/g)).toHaveLength(1)
  }
})
test('loading placeholders are announced and stop animating for reduced motion', async () => {
  const html = await renderPublic(<DetailSkeleton label="Loading video" />)
  expect(html).toContain('role="status"')
  expect(html).toContain('aria-label="Loading video"')
  expect(html).toContain('motion-reduce:animate-none')
  expect(await renderPublic(<Skeleton />)).toContain(
    'motion-reduce:animate-none',
  )
})
