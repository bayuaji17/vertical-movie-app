import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { ContentMeta } from '../src/components/admin/content-meta'
import { ContentReadiness } from '../src/components/admin/content-readiness'
import type { ContentItem } from '../src/lib/admin/content-client'
import {
  genreChips,
  readiness,
  seriesSummary,
} from '../src/lib/admin/content-readiness'

const item = (over: Partial<ContentItem> = {}): ContentItem =>
  ({
    id: '00000000-0000-4000-8000-0000000000aa',
    type: 'film',
    title: 'Midnight Harbor',
    slug: 'midnight-harbor',
    publicationStatus: 'draft',
    archivedAt: null,
    ...over,
  }) as ContentItem
const strip = (html: string) => html.replaceAll('<!-- -->', '')

test('a draft says what is missing, from the media state', () => {
  const label = (state: ContentItem['mediaState']) =>
    readiness(item({ mediaState: state }))?.label
  expect(label('needs-video')).toBe('Needs video')
  expect(label('needs-cover')).toBe('Needs cover')
  expect(label('uploading')).toBe('Uploading')
  expect(label('processing')).toBe('Processing')
  expect(label('failed')).toBe('Failed')
  expect(label('ready')).toBe('Ready to publish')
  expect(readiness(item({ mediaState: 'failed' }))?.tone).toBe('danger')
  expect(readiness(item({ mediaState: 'ready' }))?.tone).toBe('good')
})
test('live and archived rows ignore the media state; unknown state claims nothing', () => {
  expect(
    readiness(item({ publicationStatus: 'published', mediaState: 'failed' }))
      ?.label,
  ).toBe('Live')
  expect(
    readiness(
      item({ archivedAt: '2026-10-10T00:00:00.000Z', mediaState: 'ready' }),
    ),
  ).toBeUndefined()
  // An older API without the field must not produce a misleading label.
  expect(readiness(item())).toBeUndefined()
})
test('series drafts without episodes need episodes; others show their size instead', () => {
  expect(readiness(item({ type: 'series', episodeCount: 0 }))?.label).toBe(
    'Needs episodes',
  )
  expect(readiness(item({ type: 'series', episodeCount: 4 }))).toBeUndefined()
  expect(
    seriesSummary(item({ type: 'series', seasonCount: 1, episodeCount: 1 })),
  ).toBe('1 season · 1 episode')
  expect(
    seriesSummary(item({ type: 'series', seasonCount: 3, episodeCount: 12 })),
  ).toBe('3 seasons · 12 episodes')
  expect(seriesSummary(item({ type: 'series' }))).toBeUndefined()
  expect(seriesSummary(item({ seasonCount: 2 }))).toBeUndefined()
})
test('at most two genre chips are shown with a count of the rest', () => {
  expect(
    genreChips(item({ genres: ['Action', 'Comedy', 'Drama'], genreCount: 5 })),
  ).toEqual({
    names: ['Action', 'Comedy'],
    more: 3,
  })
  expect(genreChips(item({ genres: ['Action'], genreCount: 1 }))).toEqual({
    names: ['Action'],
    more: 0,
  })
  expect(genreChips(item())).toEqual({ names: [], more: 0 })
})
test('readiness is icon plus text with a tooltip; no state shows a dash for screen readers', () => {
  const html = strip(
    renderToString(
      <ContentReadiness item={item({ mediaState: 'needs-video' })} />,
    ),
  )
  expect(html).toContain('Needs video')
  expect(html).toContain('aria-hidden="true"')
  expect(html).toContain('title="Upload the video to continue."')
  expect(strip(renderToString(<ContentReadiness item={item()} />))).toContain(
    'Not applicable',
  )
  expect(
    strip(
      renderToString(
        <ContentReadiness item={item({ mediaState: 'processing' })} />,
      ),
    ),
  ).toContain('motion-reduce:animate-none')
})
test('meta shows year, genres and series size, and nothing when there is none', () => {
  expect(strip(renderToString(<ContentMeta item={item()} />))).toBe('')
  const html = strip(
    renderToString(
      <ContentMeta
        item={item({
          releaseYear: 2024,
          genres: ['Action', 'Comedy'],
          genreCount: 4,
        })}
      />,
    ),
  )
  expect(html).toContain('2024')
  expect(html).toContain('>Action<')
  expect(html).toContain('>Comedy<')
  expect(html).toContain('+2')
  const show = strip(
    renderToString(
      <ContentMeta
        item={item({
          type: 'series',
          seasonCount: 2,
          episodeCount: 8,
          releaseYear: 2020,
        })}
      />,
    ),
  )
  expect(show).toContain('2 seasons · 8 episodes · 2020')
})
