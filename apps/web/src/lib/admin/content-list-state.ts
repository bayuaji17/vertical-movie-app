import { isContentType } from './content-client'
import type { ContentFilters } from './content-client'

export function contentSearch(value: Record<string, unknown>): ContentFilters {
  const integer = (candidate: unknown, fallback: number, max: number) => {
    const n = Number(candidate)
    return Number.isInteger(n) && n >= 1 && n <= max ? n : fallback
  }
  return {
    type: isContentType(value.type) ? value.type : 'film',
    search: typeof value.search === 'string' ? value.search.slice(0, 200) : '',
    includeArchived:
      value.includeArchived === true || value.includeArchived === 'true',
    page: integer(value.page, 1, 1000000),
    pageSize: integer(value.pageSize, 10, 100),
  }
}
export function pageNumbers(page: number, totalPages: number) {
  return [
    ...new Set([
      1,
      ...[page - 1, page, page + 1].filter((x) => x > 0 && x <= totalPages),
      totalPages,
    ]),
  ]
    .filter((x) => x > 0 && x <= totalPages)
    .sort((a, b) => a - b)
}
export function pageRange(
  total: number,
  page: number,
  pageSize: number,
  count: number,
) {
  if (count === 0) return { start: 0, end: 0 }
  const start = (page - 1) * pageSize + 1
  return { start, end: Math.min(total, start + count - 1) }
}

export type ContentListControls = {
  filters: ContentFilters
  onChange: (patch: Partial<ContentFilters>) => void
}
