import { expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { GenrePicker } from '../src/components/admin/genre-picker'
import {
  atGenreLimit,
  genreLimit,
  mergeKnown,
  offeredGenreName,
  selectionSummary,
  toggleGenre,
} from '../src/lib/admin/genre-picker-state'
import { AdminSessionContext } from '../src/lib/auth/session-context'

const ids = (n: number) =>
  Array.from({ length: n }, (_, i) => `id-${String(i).padStart(3, '0')}`)
const strip = (html: string) => html.replaceAll('<!-- -->', '')

function render(value: string[], known: Array<{ id: string; name: string }>) {
  return strip(
    renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <AdminSessionContext value={{ user: { id: 'admin-1' } } as never}>
          <GenrePicker
            value={value}
            onChange={() => undefined}
            disabled={false}
            knownGenres={known}
          />
        </AdminSessionContext>
      </QueryClientProvider>,
    ),
  )
}

test('toggleGenre keeps selection order, avoids duplicates and enforces the limit', () => {
  expect(toggleGenre(['a'], 'b', true)).toEqual(['a', 'b'])
  expect(toggleGenre(['a', 'b'], 'a', true)).toEqual(['a', 'b'])
  expect(toggleGenre(['a', 'b'], 'a', false)).toEqual(['b'])
  expect(toggleGenre(['a', 'b'], 'zzz', false)).toEqual(['a', 'b'])
  const full = ids(genreLimit)
  expect(toggleGenre(full, 'extra', true)).toBe(full)
  expect(toggleGenre(full, full[0], false)).toHaveLength(genreLimit - 1)
  expect(atGenreLimit(genreLimit - 1)).toBe(false)
  expect(atGenreLimit(genreLimit)).toBe(true)
})

test('selection summary and merged names are stable', () => {
  expect(selectionSummary(0)).toBe('No genres selected · up to 100')
  expect(selectionSummary(3)).toBe('3 selected · up to 100')
  const merged = mergeKnown({ a: 'Old' }, [
    { id: 'a', name: 'New' },
    { id: 'b', name: 'B' },
  ])
  expect(merged).toEqual({ a: 'New', b: 'B' })
})

test('inline creation is offered only for a valid, new name below the limit', () => {
  const items = [{ name: 'Drama' }, { name: 'Sci-Fi' }]
  expect(offeredGenreName('  Thriller ', items, 0)).toBe('Thriller')
  expect(offeredGenreName('drama', items, 0)).toBeUndefined()
  expect(offeredGenreName('  ', items, 0)).toBeUndefined()
  expect(offeredGenreName('x'.repeat(81), items, 0)).toBeUndefined()
  expect(offeredGenreName('Thriller', items, genreLimit)).toBeUndefined()
})

test('picker shows selected names, the count and a limit notice', () => {
  const known = [
    { id: 'id-000', name: 'Drama' },
    { id: 'id-001', name: 'Comedy' },
  ]
  const html = render(['id-000', 'id-001'], known)
  expect(html).toContain('Remove Drama')
  expect(html).toContain('Remove Comedy')
  expect(html).toContain('2 selected · up to 100')
  expect(html).toContain('for="genre-search"')
  expect(html).not.toContain('reached the limit')

  const full = render(ids(genreLimit), known)
  expect(full).toContain('100 selected · up to 100')
  expect(full).toContain('reached the limit of 100 genres')
  expect(full).toContain('Remove genre id-050')
})
