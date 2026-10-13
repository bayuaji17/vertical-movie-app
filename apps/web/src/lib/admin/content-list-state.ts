import { contentSorts, contentStatuses, isContentType } from './content-client'
import type {
  ContentFilters,
  ContentOrder,
  ContentSort,
  ContentStatus,
} from './content-client'

// Text columns read A to Z first; dates start with the newest.
export const defaultOrder = (sort: ContentSort): ContentOrder =>
  sort === 'title' || sort === 'status' ? 'asc' : 'desc'
export const effectiveOrder = (
  filters: Pick<ContentFilters, 'sort' | 'order'>,
): ContentOrder => filters.order ?? defaultOrder(filters.sort)
// An order equal to the natural one is not kept, so URLs have one spelling.
export const canonicalOrder = (
  sort: ContentSort,
  order: ContentOrder | undefined,
) => (order && order !== defaultOrder(sort) ? order : undefined)
const isStatus = (value: unknown): value is ContentStatus =>
  contentStatuses.some((status) => status === value)
const isSort = (value: unknown): value is ContentSort =>
  contentSorts.some((sort) => sort === value)

export function contentSearch(value: Record<string, unknown>): ContentFilters {
  const integer = (candidate: unknown, fallback: number, max: number) => {
    const n = Number(candidate)
    return Number.isInteger(n) && n >= 1 && n <= max ? n : fallback
  }
  const sort = isSort(value.sort) ? value.sort : 'updated'
  const order =
    value.order === 'asc' || value.order === 'desc' ? value.order : undefined
  return {
    type: isContentType(value.type) ? value.type : 'film',
    search: typeof value.search === 'string' ? value.search.slice(0, 200) : '',
    // Links saved before the status filter used includeArchived.
    status: isStatus(value.status)
      ? value.status
      : value.includeArchived === true || value.includeArchived === 'true'
        ? 'all'
        : 'active',
    sort,
    order: canonicalOrder(sort, order),
    page: integer(value.page, 1, 1000000),
    pageSize: integer(value.pageSize, 10, 100),
  }
}
// Values that are not written to the URL.
export const contentSearchDefaults = {
  type: 'film',
  search: '',
  status: 'active',
  sort: 'updated',
  page: 1,
  pageSize: 10,
} as const
export const isFiltered = (filters: ContentFilters) =>
  filters.search !== '' || filters.status !== 'active'
/** Number of non-default choices behind the mobile "Filters" button. */
export const activeFilterCount = (filters: ContentFilters) =>
  (filters.status !== 'active' ? 1 : 0) +
  (filters.sort !== 'updated' || filters.order ? 1 : 0)
export const clearedFilters = {
  search: '',
  status: 'active',
  sort: 'updated',
  order: undefined,
  page: 1,
} as const satisfies Partial<ContentFilters>
/** Choosing a column sorts by it; choosing it again reverses the order. */
export function sortPatch(
  filters: ContentFilters,
  column: ContentSort,
): Partial<ContentFilters> {
  if (filters.sort !== column)
    return { sort: column, order: undefined, page: 1 }
  const reversed = effectiveOrder(filters) === 'asc' ? 'desc' : 'asc'
  return { order: canonicalOrder(column, reversed), page: 1 }
}
export const ariaSort = (filters: ContentFilters, column: ContentSort) =>
  filters.sort !== column
    ? undefined
    : effectiveOrder(filters) === 'asc'
      ? ('ascending' as const)
      : ('descending' as const)

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
