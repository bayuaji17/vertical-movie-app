import { redirect } from '@tanstack/react-router'
import { catalogSearch } from './catalog-model'

type Location = { pathname: string; searchStr: string }
const hasType = (location: Location) =>
  new URLSearchParams(location.searchStr).get('type')

// Home keeps only non-default filters and a trimmed query in the URL.
export function normalizeBrowseLocation(location: Location) {
  const params = new URLSearchParams(location.searchStr)
  const canonical = catalogSearch(Object.fromEntries(params))
  const type = params.get('type'),
    q = params.get('q')
  if (
    (type !== null && type !== canonical.type) ||
    (q !== null && q !== canonical.q)
  )
    throw redirect({ to: location.pathname, search: canonical, replace: true })
}

// Detail and watch URLs carry no query; drop legacy `?type=` links.
export function stripLegacyTypeSearch(location: Location) {
  if (hasType(location) !== null)
    throw redirect({ to: location.pathname, search: {}, replace: true })
}

// Router history state marking a detail entry opened from the browse grid.
export const browseEntryState: Record<string, unknown> = { fromBrowse: true }
export function openedFromBrowse(state: unknown) {
  return (
    typeof state === 'object' &&
    state !== null &&
    'fromBrowse' in state &&
    state.fromBrowse === true
  )
}
