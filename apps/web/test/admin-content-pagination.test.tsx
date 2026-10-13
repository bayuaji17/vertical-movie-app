import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { ContentPagination } from '../src/components/admin/content-pagination'
import type { ContentPage } from '../src/lib/admin/content-client'
import {
  contentSearch,
  pageSizeOptions,
} from '../src/lib/admin/content-list-state'

const strip = (html: string) => html.replaceAll('<!-- -->', '')
const page = (over: Partial<ContentPage> = {}): ContentPage => ({
  items: Array.from({ length: 10 }, () => ({}) as ContentPage['items'][number]),
  total: 28,
  page: 1,
  pageSize: 10,
  totalPages: 3,
  ...over,
})
const view = (
  data: ContentPage | undefined,
  query: Record<string, unknown> = {},
  pending = false,
) =>
  strip(
    renderToString(
      <ContentPagination
        filters={contentSearch({
          page: data?.page,
          pageSize: data?.pageSize,
          ...query,
        })}
        onChange={() => {}}
        data={data}
        pending={pending}
      />,
    ),
  )

test('page size options are the usual ones plus a size carried by a link', () => {
  expect(pageSizeOptions(10)).toEqual([10, 25, 50, 100])
  expect(pageSizeOptions(7)).toEqual([7, 10, 25, 50, 100])
  expect(pageSizeOptions(60)).toEqual([10, 25, 50, 60, 100])
})
test('the footer is a single compact block: range, previous/next with pages, and Rows', () => {
  const html = view(page())
  expect(html).toContain('Showing 1–10 of 28')
  expect(html).toContain('aria-label="Content pagination"')
  expect(html).toContain('aria-label="Page 2"')
  expect(html).toContain('aria-current="page"')
  expect(html).toContain('Previous')
  expect(html).toContain('Next')
  expect(html).toContain('>Rows<')
  // No separate custom-size input any more.
  expect(html).not.toContain('Custom')
  expect(html).not.toContain('custom-page-size')
  // Page numbers are for wide screens; narrow ones read "Page X of Y".
  expect(html).toContain('Page 1 of 3')
  expect(html).toContain('hidden items-center gap-1 sm:flex')
})
test('previous is disabled on the first page and next on the last', () => {
  const disabled = (html: string, label: string) =>
    new RegExp(
      `<button[^>]*\\bdisabled=""[^>]*>(?:<svg[\\s\\S]*?</svg>)?${label}`,
    ).test(html)
  const first = view(page())
  expect(disabled(first, 'Previous')).toBe(true)
  expect(disabled(first, 'Next')).toBe(false)
  const last = view(page({ page: 3, items: page().items.slice(0, 8) }))
  expect(last).toContain('Showing 21–28 of 28')
  expect(disabled(last, 'Next')).toBe(true)
  expect(disabled(last, 'Previous')).toBe(false)
})
test('one page of results has no page navigation but keeps the Rows choice', () => {
  const html = view(
    page({ total: 4, totalPages: 1, items: page().items.slice(0, 4) }),
  )
  expect(html).toContain('Showing 1–4 of 4')
  expect(html).not.toContain('Content pagination')
  expect(html).toContain('>Rows<')
})
test('nothing is shown while loading or when there are no results', () => {
  expect(view(undefined)).toBe('')
  expect(view(page({ total: 0, totalPages: 0, items: [] }))).toBe('')
})
test('an unusual page size from a link is still selectable', () => {
  const html = view(page({ pageSize: 7 }), { pageSize: 7 })
  expect(
    /<option[^>]*value="7"[^>]*selected=""[^>]*>7<\/option>/.test(html),
  ).toBe(true)
})
