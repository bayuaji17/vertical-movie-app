import { RiArrowDownLine, RiArrowUpLine } from '@remixicon/react'
import { TableHead } from '#/components/ui/table'
import type { ContentFilters, ContentSort } from '#/lib/admin/content-client'
import {
  ariaSort,
  effectiveOrder,
  sortPatch,
} from '#/lib/admin/content-list-state'

/** Column header that sorts by its column; `aria-sort` reports the state. */
export function ContentSortHead({
  label,
  column,
  filters,
  onChange,
}: {
  label: string
  column: ContentSort
  filters: ContentFilters
  onChange: (patch: Partial<ContentFilters>) => void
}) {
  const active = filters.sort === column
  return (
    <TableHead aria-sort={ariaSort(filters, column)}>
      <button
        type="button"
        className="-mx-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => onChange(sortPatch(filters, column))}
      >
        {label}
        <span className="sr-only">, sort</span>
        {active &&
          (effectiveOrder(filters) === 'asc' ? (
            <RiArrowUpLine className="size-4" aria-hidden="true" />
          ) : (
            <RiArrowDownLine className="size-4" aria-hidden="true" />
          ))}
      </button>
    </TableHead>
  )
}
