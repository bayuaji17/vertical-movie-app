import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { PublicPoster } from '../src/components/public/public-poster'
import type { PublicVideo } from '../src/lib/public/catalog-model'

test('server-rendered cover reserves portrait frame without issuing or embedding capabilities', () => {
  const video: PublicVideo = {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'a-film',
    title: 'A Film',
    synopsis: 'Story',
    kind: 'movie',
    durationMs: 60000,
    seasonNumber: null,
    episodeNumber: null,
    seriesSlug: null,
  }
  const html = renderToString(<PublicPoster video={video} />)
  expect(html).toContain('aspect-[9/16]')
  expect(html).toContain('data-public-poster')
  expect(html).not.toMatch(/<img|posterUrl|masterUrl|signature|https?:/)
})
