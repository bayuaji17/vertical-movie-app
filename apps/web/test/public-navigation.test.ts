import { expect, test } from 'bun:test'
import { isRedirect } from '@tanstack/react-router'
import {
  browseEntryState,
  normalizeBrowseLocation,
  openedFromBrowse,
  stripLegacyTypeSearch,
} from '../src/lib/public/catalog-navigation'
import {
  browseFilters,
  browseSearch,
  normalizeQuery,
} from '../src/lib/public/catalog-model'

function redirected(run: () => void): { to: unknown; search: unknown } | null {
  try {
    run()
  } catch (error) {
    if (isRedirect(error))
      return { to: error.options.to, search: error.options.search }
    throw error
  }
  return null
}
const at = (pathname: string, searchStr: string) => ({ pathname, searchStr })

test('detail and watch URLs drop any legacy type query', () => {
  for (const path of ['/videos/test-film-1', '/watch/test-film-1'])
    for (const value of ['all', 'film', 'standalone', 'wrong', ''])
      expect(
        redirected(() => stripLegacyTypeSearch(at(path, '?type=' + value))),
      ).toEqual({ to: path, search: {} })
  expect(
    redirected(() => stripLegacyTypeSearch(at('/videos/a', ''))),
  ).toBeNull()
})
test('home keeps only non-default filters and a trimmed query in the URL', () => {
  for (const search of [
    '',
    '?type=film',
    '?type=standalone',
    '?type=series',
    '?q=night',
    '?type=film&q=night',
  ])
    expect(
      redirected(() => normalizeBrowseLocation(at('/', search))),
    ).toBeNull()
  for (const [search, expected] of [
    ['?type=all', {}],
    ['?type=wrong', {}],
    ['?type=Film', {}],
    ['?type=all&q=night', { q: 'night' }],
    ['?type=film&q=', { type: 'film' }],
    ['?q=%20%20', {}],
    ['?q=%20night%20', { q: 'night' }],
    ['?type=bogus&q=%20a%20', { q: 'a' }],
  ] as const)
    expect(redirected(() => normalizeBrowseLocation(at('/', search)))).toEqual({
      to: '/',
      search: expected,
    })
  const long = 'x'.repeat(250)
  expect(
    redirected(() => normalizeBrowseLocation(at('/', '?q=' + long))),
  ).toEqual({ to: '/', search: { q: 'x'.repeat(200) } })
})
test('browse filters map the URL type to API kind and bound the query', () => {
  expect(browseFilters('all', '')).toEqual({
    search: '',
    kind: 'all',
    genreId: 'all',
  })
  expect(browseFilters('film', ' Night ').kind).toBe('movie')
  expect(browseFilters('series', 'a').kind).toBe('series')
  expect(browseFilters('standalone', 'a').kind).toBe('standalone')
  expect([...browseFilters('all', '😀'.repeat(300)).search]).toHaveLength(200)
  expect(normalizeQuery(undefined)).toBe('')
  expect(normalizeQuery(['a'])).toBe('')
})
test('browse search omits the default filter', () => {
  expect(browseSearch('all')).toEqual({})
  expect(browseSearch('all', '  ')).toEqual({})
  expect(browseSearch('series', ' abc ')).toEqual({ type: 'series', q: 'abc' })
  expect(browseSearch('film')).toEqual({ type: 'film' })
  expect(browseSearch('standalone')).toEqual({ type: 'standalone' })
})
test('only entries opened from browse go back through history', () => {
  expect(openedFromBrowse(browseEntryState)).toBe(true)
  for (const state of [undefined, null, {}, { fromBrowse: 'yes' }, 'x'])
    expect(openedFromBrowse(state)).toBe(false)
})
