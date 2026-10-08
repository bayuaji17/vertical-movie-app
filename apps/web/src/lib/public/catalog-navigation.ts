import { redirect } from '@tanstack/react-router'
import { catalogTypes } from './catalog-model'

export function normalizeCatalogLocation(location: {
  pathname: string
  searchStr: string
}) {
  const type = new URLSearchParams(location.searchStr).get('type')
  if (type !== null && !catalogTypes.some((value) => value === type))
    throw redirect({
      to: location.pathname,
      search: { type: 'all' },
      replace: true,
    })
}
