import { expect, test } from 'bun:test'
import { isRedirect } from '@tanstack/react-router'
import {
  browseEntryState,
  normalizeBrowseLocation,
  openedFromBrowse,
  stripLegacyTypeSearch,
} from '../src/lib/public/catalog-navigation'
import { browseSearch } from '../src/lib/public/catalog-model'

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
test('home keeps only film and standalone filters in the URL', () => {
  for (const value of ['film', 'standalone'])
    expect(
      redirected(() => normalizeBrowseLocation(at('/', '?type=' + value))),
    ).toBeNull()
  expect(redirected(() => normalizeBrowseLocation(at('/', '')))).toBeNull()
  for (const value of ['all', 'wrong', 'series'])
    expect(
      redirected(() => normalizeBrowseLocation(at('/', '?type=' + value))),
    ).toEqual({ to: '/', search: {} })
})
test('browse search omits the default filter', () => {
  expect(browseSearch('all')).toEqual({})
  expect(browseSearch('film')).toEqual({ type: 'film' })
  expect(browseSearch('standalone')).toEqual({ type: 'standalone' })
})
test('only entries opened from browse go back through history', () => {
  expect(openedFromBrowse(browseEntryState)).toBe(true)
  for (const state of [undefined, null, {}, { fromBrowse: 'yes' }, 'x'])
    expect(openedFromBrowse(state)).toBe(false)
})
