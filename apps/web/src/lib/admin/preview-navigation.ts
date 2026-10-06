import { isUuid } from './content-identifiers'

export function previewContext(search: Record<string, unknown>): {
  type?: 'film' | 'standalone'
} {
  return search.type === 'film' || search.type === 'standalone'
    ? { type: search.type }
    : {}
}
export function previewDetailHref(id: string, type?: 'film' | 'standalone') {
  return type && isUuid(id) ? `/admin/content/${type}/${id}` : undefined
}
