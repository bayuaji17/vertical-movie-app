import { isUuid } from './content-identifiers'

export function previewContext(search: Record<string, unknown>): {
  type?: 'film' | 'standalone' | 'episode'
  seriesId?: string
} {
  if (search.type === 'episode' && isUuid(search.seriesId))
    return { type: 'episode', seriesId: search.seriesId }
  return search.type === 'film' || search.type === 'standalone'
    ? { type: search.type }
    : {}
}
export function previewDetailHref(
  id: string,
  type?: 'film' | 'standalone' | 'episode',
  seriesId?: string,
) {
  if (type === 'episode')
    return isUuid(id) && isUuid(seriesId)
      ? `/admin/series/${seriesId}/episodes/${id}`
      : undefined
  return type && isUuid(id) ? `/admin/content/${type}/${id}` : undefined
}
