import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react'
import type { ContentListControls } from '#/lib/admin/content-list-state'
import {
  pageNumbers,
  pageRange,
  pageSizeOptions,
} from '#/lib/admin/content-list-state'
import type { ContentPage } from '#/lib/admin/content-client'
import { Button } from '#/components/ui/button'
import { FieldLabel } from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'

/**
 * One compact footer: what is shown, previous/next with page numbers, and a
 * small "Rows" choice. Nothing is shown when there is nothing to page through.
 */
export function ContentPagination({
  filters,
  onChange,
  data,
  pending,
}: ContentListControls & { data?: ContentPage; pending: boolean }) {
  if (!data || data.total === 0) return null
  const range = pageRange(
    data.total,
    data.page,
    data.pageSize,
    data.items.length,
  )
  const pages = data.totalPages > 1
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {range.start}–{range.end} of {data.total}
        {pages && (
          <span className="sm:hidden">
            {' '}
            · Page {data.page} of {data.totalPages}
          </span>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        {pages && (
          <nav
            aria-label="Content pagination"
            className="flex items-center gap-1"
          >
            <Button
              variant="outline"
              className="min-h-11"
              disabled={filters.page <= 1 || pending}
              onClick={() => onChange({ page: filters.page - 1 })}
            >
              <RiArrowLeftSLine data-icon="inline-start" aria-hidden="true" />
              Previous
            </Button>
            {pageNumbers(filters.page, data.totalPages).map(
              (page, index, nums) => (
                <span key={page} className="hidden items-center gap-1 sm:flex">
                  {index > 0 && page - nums[index - 1] > 1 && (
                    <span className="px-1" aria-hidden="true">
                      …
                    </span>
                  )}
                  <Button
                    variant={page === filters.page ? 'secondary' : 'ghost'}
                    className="min-h-11 min-w-11"
                    aria-current={page === filters.page ? 'page' : undefined}
                    aria-label={`Page ${page}`}
                    disabled={pending}
                    onClick={() => onChange({ page })}
                  >
                    {page}
                  </Button>
                </span>
              ),
            )}
            <Button
              variant="outline"
              className="min-h-11"
              disabled={filters.page >= data.totalPages || pending}
              onClick={() => onChange({ page: filters.page + 1 })}
            >
              Next
              <RiArrowRightSLine data-icon="inline-end" aria-hidden="true" />
            </Button>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor="page-size" className="shrink-0">
            Rows
          </FieldLabel>
          <NativeSelect
            id="page-size"
            value={String(filters.pageSize)}
            className="[&_select]:h-11"
            onChange={(event) =>
              onChange({ pageSize: Number(event.target.value), page: 1 })
            }
          >
            {pageSizeOptions(filters.pageSize).map((n) => (
              <NativeSelectOption key={n} value={n}>
                {n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  )
}
