import { useState, useEffect } from 'react'
import type { ContentListControls } from '#/lib/admin/content-list-state'
import { pageRange, pageNumbers } from '#/lib/admin/content-list-state'
import type { ContentPage } from '#/lib/admin/content-client'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
} from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'

const sizes = [10, 25, 50, 100]
export function ContentPagination({
  filters,
  onChange,
  data,
  pending,
}: ContentListControls & { data?: ContentPage; pending: boolean }) {
  const [custom, setCustom] = useState(!sizes.includes(filters.pageSize)),
    [customValue, setCustomValue] = useState(String(filters.pageSize)),
    [sizeError, setSizeError] = useState<string>()
  useEffect(() => {
    setCustomValue(String(filters.pageSize))
    setCustom(!sizes.includes(filters.pageSize))
    setSizeError(undefined)
  }, [filters.pageSize])
  const range = data
    ? pageRange(data.total, data.page, data.pageSize, data.items.length)
    : { start: 0, end: 0 }
  function applyCustom() {
    const n = Number(customValue)
    if (
      !/^\d+$/.test(customValue) ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 100
    ) {
      setSizeError('Use a whole number from 1 to 100.')
      return
    }
    setSizeError(undefined)
    onChange({ pageSize: n, page: 1 })
  }
  return (
    <>
      <FieldGroup className="mt-6 gap-4">
        <Field>
          <FieldLabel htmlFor="page-size">Rows per page</FieldLabel>
          <div className="flex flex-wrap items-start gap-3">
            <NativeSelect
              id="page-size"
              value={custom ? 'custom' : String(filters.pageSize)}
              className="[&_select]:h-11"
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setCustom(true)
                  return
                }
                setCustom(false)
                onChange({ pageSize: Number(e.target.value), page: 1 })
              }}
            >
              {sizes.map((n) => (
                <NativeSelectOption key={n} value={n}>
                  {n}
                </NativeSelectOption>
              ))}
              <NativeSelectOption value="custom">Custom</NativeSelectOption>
            </NativeSelect>
            {custom && (
              <Field data-invalid={!!sizeError} className="max-w-52">
                <FieldLabel htmlFor="custom-page-size" className="sr-only">
                  Custom page size
                </FieldLabel>
                <Input
                  id="custom-page-size"
                  className="h-11"
                  inputMode="numeric"
                  value={customValue}
                  aria-invalid={!!sizeError}
                  aria-describedby={sizeError ? 'page-size-error' : undefined}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onBlur={applyCustom}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCustom()
                  }}
                />
                {sizeError ? (
                  <FieldError id="page-size-error">{sizeError}</FieldError>
                ) : (
                  <span className="text-xs text-muted-foreground">1–100</span>
                )}
              </Field>
            )}
          </div>
        </Field>
      </FieldGroup>
      {data && (
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {range.start}–{range.end} of {data.total}
            {data.totalPages > 0 &&
              ` · Page ${data.page} of ${data.totalPages}`}
          </p>
          <nav aria-label="Content pagination" className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={filters.page <= 1 || pending}
              onClick={() => onChange({ page: filters.page - 1 })}
            >
              Previous
            </Button>
            {pageNumbers(filters.page, data.totalPages).map(
              (page, index, nums) => (
                <span key={page} className="flex items-center gap-1">
                  {index > 0 && page - nums[index - 1] > 1 && (
                    <span className="px-1" aria-hidden="true">
                      …
                    </span>
                  )}
                  <Button
                    variant={page === filters.page ? 'secondary' : 'ghost'}
                    className="min-h-11 min-w-11"
                    aria-current={page === filters.page ? 'page' : undefined}
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
            </Button>
          </nav>
        </div>
      )}
    </>
  )
}
