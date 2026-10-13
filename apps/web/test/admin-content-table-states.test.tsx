import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import {
  ContentEmpty,
  ContentListSkeleton,
  emptyReason,
  skeletonRows,
} from '../src/components/admin/content-list-states'
import { ContentUpdated } from '../src/components/admin/content-updated'
import { fullTime, relativeTime } from '../src/lib/admin/content-time'

const strip = (html: string) => html.replaceAll('<!-- -->', '')
const now = Date.parse('2026-10-13T12:00:00Z')
const ago = (ms: number) => new Date(now - ms).toISOString()
const minute = 60_000,
  hour = 60 * minute,
  day = 24 * hour

test('relative time steps through minutes, hours and days and then shows a date', () => {
  const at = (ms: number) => relativeTime(ago(ms), { now, timeZone: 'UTC' })
  expect(at(10_000)).toBe('Just now')
  expect(at(minute)).toBe('1 minute ago')
  expect(at(59 * minute)).toBe('59 minutes ago')
  expect(at(hour)).toBe('1 hour ago')
  expect(at(23 * hour)).toBe('23 hours ago')
  expect(at(day)).toBe('yesterday')
  expect(at(6 * day)).toBe('6 days ago')
  expect(at(7 * day)).toBe('Oct 6, 2026')
  expect(at(-5 * minute)).toBe('Just now') // a clock slightly ahead of the server
  expect(relativeTime('not a date')).toBe('not a date')
})
test('the full local time is available for the tooltip and the markup keeps ISO', () => {
  expect(fullTime('2026-10-13T08:05:00Z', 'UTC')).toBe('Oct 13, 2026, 8:05 AM')
  const html = strip(
    renderToString(<ContentUpdated value={ago(2 * hour)} now={now} />),
  )
  expect(html).toContain(`dateTime="${ago(2 * hour)}"`)
  expect(html).toContain('2 hours ago')
  expect(html).toMatch(/title="[^"]+"/)
})
test('the loading skeleton mirrors the list: table and cards, capped rows', () => {
  expect(skeletonRows(1)).toBe(3)
  expect(skeletonRows(10)).toBe(10)
  expect(skeletonRows(100)).toBe(10)
  const html = strip(renderToString(<ContentListSkeleton pageSize={4} />))
  expect(html).toContain('role="status"')
  expect(html).toContain('<table')
  expect(html).toContain('lg:hidden')
  expect(html.match(/<tr/g)).toHaveLength(1 + 4)
  expect(html).toContain('Loading content...')
})
test('an empty list explains why and offers the matching way out', () => {
  expect(emptyReason(5, false)).toBe('page')
  expect(emptyReason(0, true)).toBe('filtered')
  expect(emptyReason(0, false)).toBe('none')
  const view = (reason: 'page' | 'filtered' | 'none') =>
    strip(
      renderToString(
        <ContentEmpty
          reason={reason}
          onClear={() => {}}
          onFirstPage={() => {}}
        />,
      ),
    )
  expect(view('filtered')).toContain('No matching content')
  expect(view('filtered')).toContain('Clear filters')
  expect(view('page')).toContain('Go to the first page')
})
