import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { CatalogBrowser } from '../src/components/public/catalog-browser'
import { catalogQueryKey } from '../src/lib/catalog/public-catalog-queries'
import { browseFilters } from '../src/lib/public/catalog-model'
import type { CatalogType } from '../src/lib/public/catalog-model'
import type { CatalogItem } from '../src/lib/catalog/public-catalog-model'
import { renderPublic } from './public-render'

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
function item(n: number, kind: CatalogItem['kind'] = 'movie'): CatalogItem {
  const common = {
    id: id(n),
    slug: 'title-' + n,
    title: 'Title ' + n,
    synopsis: 'Story',
    publishedAt: '2026-10-01T00:00:00.123456Z',
    genres: [],
    posterPath: `/catalog/${kind}/${id(n)}/poster`,
    poster: `/api/catalog/${kind}/${id(n)}/poster`,
  }
  return kind === 'series'
    ? { ...common, kind, episodeCount: 3 }
    : { ...common, kind, durationMs: 60_000 }
}
function seeded(
  type: CatalogType,
  q: string,
  items: CatalogItem[],
  nextCursor: string | null = null,
) {
  const client = new QueryClient()
  client.setQueryData(catalogQueryKey(browseFilters(type, q)), {
    pages: [
      {
        items,
        total: items.length,
        nextCursor,
        freshForMs: 60_000,
        expiresAt: Date.now() + 60_000,
      },
    ],
    pageParams: [null],
  })
  return client
}
const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '|')
    .replace(/\|+/g, '|')

test('Browse lists movies, standalone and series with filter buttons and a title count', async () => {
  const items = [item(1), item(2, 'series'), item(3, 'standalone')]
  const html = await renderPublic(
    <CatalogBrowser type="all" q="" status={null} />,
    seeded('all', '', items),
  )
  expect(html.match(/data-public-card/g)).toHaveLength(3)
  expect(html).toContain('href="/videos/title-1"')
  expect(html).toContain('href="/series/title-2"')
  expect(html).toContain('href="/videos/title-3"')
  expect(text(html)).toContain('3 titles')
  expect(html.match(/<h1/g)).toHaveLength(1)
  for (const label of ['All', 'Films', 'Standalone', 'Series'])
    expect(text(html)).toContain(`|${label}|`)
  expect(html).toContain('aria-pressed="true"')
  expect(html).not.toContain('Load more')
  expect(html).toContain('You’re all caught up.')
})
test('search results state the query and count and offer Load more while a cursor exists', async () => {
  const html = await renderPublic(
    <CatalogBrowser type="film" q="night" status={null} />,
    seeded('film', 'night', [item(1)], 'next'),
  )
  expect(text(html)).toContain('1 result for “night”')
  expect(html).toContain('value="night"')
  expect(html).toContain('Load more')
  expect(html).not.toContain('caught up')
})
test('empty and failed searches explain what happened and offer a way out', async () => {
  const none = await renderPublic(
    <CatalogBrowser type="all" q="zzz" status={null} />,
    seeded('all', 'zzz', []),
  )
  expect(text(none)).toContain('No results for “zzz”')
  expect(none).toContain('Clear search')
  expect(none).not.toContain('data-public-card')
  const category = await renderPublic(
    <CatalogBrowser type="series" q="" status={null} />,
    seeded('series', '', []),
  )
  expect(text(category)).toContain('No videos in this category')
  expect(category).toContain('Browse all')
  const failed = await renderPublic(
    <CatalogBrowser type="all" q="night" status={503} />,
  )
  expect(text(failed)).toContain('Could not search')
  expect(failed).toContain('Retry search')
  const failedList = await renderPublic(
    <CatalogBrowser type="all" q="" status={503} />,
  )
  expect(text(failedList)).toContain('Could not load videos')
  expect(failedList).not.toContain('Retry search')
})
test('card titles never reflect markup from the search text', async () => {
  const html = await renderPublic(
    <CatalogBrowser
      type="all"
      q="<img src=x onerror=alert(1)>"
      status={null}
    />,
    seeded('all', '<img src=x onerror=alert(1)>', []),
  )
  expect(html).not.toContain('<img src=x')
  expect(html).toContain('&lt;img')
})
