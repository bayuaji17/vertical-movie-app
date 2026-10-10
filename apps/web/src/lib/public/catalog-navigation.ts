import { redirect } from '@tanstack/react-router'

type Location = { pathname: string; searchStr: string }
const hasType = (location: Location) =>
  new URLSearchParams(location.searchStr).get('type')

// Home keeps only the film/standalone filters; "all" is the clean URL.
export function normalizeBrowseLocation(location: Location) {
  const type = hasType(location)
  if (type !== null && type !== 'film' && type !== 'standalone')
    throw redirect({ to: location.pathname, search: {}, replace: true })
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
