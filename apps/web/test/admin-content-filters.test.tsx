import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { ContentFiltersPanel } from '../src/components/admin/content-filters'
import { ContentResultSummary } from '../src/components/admin/content-list-states'
import { ContentSortHead } from '../src/components/admin/content-sort-head'
import { contentSearch } from '../src/lib/admin/content-list-state'

const strip = (html: string) => html.replaceAll('<!-- -->', '')
const panel = (query: Record<string, unknown> = {}) =>
  strip(
    renderToString(
      <ContentFiltersPanel
        filters={contentSearch(query)}
        onChange={() => {}}
      />,
    ),
  )

test('the filter bar offers type, status and sorting, with the current choices selected', () => {
  const html = panel({ type: 'series', status: 'draft', sort: 'title' })
  for (const label of ['Film', 'Standalone', 'Series'])
    expect(html).toContain(`>${label}<`)
  for (const label of ['Active', 'Draft', 'Published', 'Archived', 'All'])
    expect(html).toContain(`>${label}<`)
  expect(html).toContain('aria-label="Status"')
  expect(html).toContain('Sort by')
  for (const label of ['Last updated', 'Date created', 'Title', 'Status'])
    expect(html).toContain(label)
  // Natural order for a title is A to Z.
  expect(html).toContain('Sorted ascending. Sort descending')
  expect(panel({ sort: 'updated' })).toContain(
    'Sorted descending. Sort ascending',
  )
  expect(html).toContain('Search title or slug')
  expect(html).toContain('aria-keyshortcuts="/"')
})
test('every control keeps a 44 px target', () => {
  const html = panel()
  expect(html.match(/min-h-11/g)!.length).toBeGreaterThanOrEqual(8)
  expect(html).toContain('size-11')
})
test('search shows a clear button only when there is text', () => {
  expect(panel()).not.toContain('Clear search')
  expect(panel({ search: 'rain' })).toContain('aria-label="Clear search"')
})
test('the mobile Filters button counts the non-default choices', () => {
  expect(panel()).not.toContain('active</span>')
  expect(panel({ status: 'draft' })).toContain(', 1 active')
  expect(panel({ status: 'draft', sort: 'title' })).toContain(', 2 active')
})
test('sortable headers report their state and name their action', () => {
  const head = (query: Record<string, unknown>, column: 'title' | 'updated') =>
    strip(
      renderToString(
        <table>
          <thead>
            <tr>
              <ContentSortHead
                label={column === 'title' ? 'Title' : 'Updated'}
                column={column}
                filters={contentSearch(query)}
                onChange={() => {}}
              />
            </tr>
          </thead>
        </table>,
      ),
    )
  expect(head({ sort: 'title' }, 'title')).toContain('aria-sort="ascending"')
  expect(head({ sort: 'title', order: 'desc' }, 'title')).toContain(
    'aria-sort="descending"',
  )
  expect(head({ sort: 'title' }, 'updated')).not.toContain('aria-sort')
  expect(head({}, 'updated')).toContain(
    'Updated<span class="sr-only">, sort</span>',
  )
  expect(head({}, 'updated')).toContain('min-h-11')
})
test('the result summary only appears for a search or filter and offers Clear all', () => {
  const view = (props: Partial<Parameters<typeof ContentResultSummary>[0]>) =>
    strip(
      renderToString(
        <ContentResultSummary
          total={12}
          search=""
          statusLabel="Active"
          filtered={false}
          onClear={() => {}}
          {...props}
        />,
      ),
    )
  expect(view({})).not.toContain('result')
  expect(view({})).not.toContain('Clear all')
  expect(view({ filtered: true, search: 'rain' })).toContain(
    '12 results for “rain” · Active',
  )
  expect(view({ filtered: true, total: 1, statusLabel: 'Draft' })).toContain(
    '1 result · Draft',
  )
  expect(view({ filtered: true })).toContain('Clear all')
  expect(view({})).toContain('role="status"')
})
