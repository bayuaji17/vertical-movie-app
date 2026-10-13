import { useEffect, useId, useRef, useState } from 'react'
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiEqualizerLine,
  RiSearchLine,
} from '@remixicon/react'
import {
  contentLabels,
  contentSorts,
  contentStatusLabels,
  contentStatuses,
  contentTypes,
  isContentType,
} from '#/lib/admin/content-client'
import type { ContentSort, ContentStatus } from '#/lib/admin/content-client'
import {
  activeFilterCount,
  clearedFilters,
  effectiveOrder,
  sortPatch,
} from '#/lib/admin/content-list-state'
import type { ContentListControls } from '#/lib/admin/content-list-state'
import { useSearchShortcut } from '#/hooks/use-search-shortcut'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { FieldGroup, Field, FieldLabel } from '#/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'

const sortLabels: Record<ContentSort, string> = {
  updated: 'Last updated',
  created: 'Date created',
  title: 'Title',
  status: 'Status',
}
const isStatus = (value: unknown): value is ContentStatus =>
  contentStatuses.some((status) => status === value)

function StatusFilter({
  filters,
  onChange,
  className,
}: ContentListControls & { className?: string }) {
  return (
    <ToggleGroup
      aria-label="Status"
      value={[filters.status]}
      onValueChange={(values) => {
        // Pressing the selected item again must not leave nothing selected.
        if (isStatus(values[0])) onChange({ status: values[0], page: 1 })
      }}
      className={className}
      spacing={1}
    >
      {contentStatuses.map((status) => (
        <ToggleGroupItem
          className="min-h-11 flex-1 px-3 data-pressed:bg-primary/15 sm:flex-none"
          key={status}
          value={status}
        >
          {contentStatusLabels[status]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function SortControls({ filters, onChange }: ContentListControls) {
  const order = effectiveOrder(filters),
    id = useId()
  return (
    <div className="flex items-center gap-2">
      <FieldLabel htmlFor={id} className="shrink-0">
        Sort by
      </FieldLabel>
      <NativeSelect
        id={id}
        value={filters.sort}
        className="[&_select]:h-11"
        onChange={(event) => {
          const next = contentSorts.find((sort) => sort === event.target.value)
          if (next) onChange({ sort: next, order: undefined, page: 1 })
        }}
      >
        {contentSorts.map((sort) => (
          <NativeSelectOption key={sort} value={sort}>
            {sortLabels[sort]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button
        variant="outline"
        className="size-11"
        aria-label={
          order === 'asc'
            ? 'Sorted ascending. Sort descending'
            : 'Sorted descending. Sort ascending'
        }
        onClick={() => onChange(sortPatch(filters, filters.sort))}
      >
        {order === 'asc' ? (
          <RiArrowUpLine aria-hidden="true" />
        ) : (
          <RiArrowDownLine aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}

// Status and sorting live in a sheet on narrow screens so the list starts
// close to the top; every choice applies immediately, as on desktop.
function MobileFilters({ filters, onChange }: ContentListControls) {
  const count = activeFilterCount(filters)
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" className="min-h-11 gap-2 sm:hidden" />
        }
      >
        <RiEqualizerLine aria-hidden="true" />
        Filters
        {count > 0 && <Badge aria-hidden="true">{count}</Badge>}
        {count > 0 && <span className="sr-only">, {count} active</span>}
      </SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Changes apply to the list right away.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-2">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Status</span>
            <StatusFilter
              filters={filters}
              onChange={onChange}
              className="flex w-full flex-wrap"
            />
          </div>
          <SortControls filters={filters} onChange={onChange} />
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() =>
              onChange({
                status: clearedFilters.status,
                sort: clearedFilters.sort,
                order: undefined,
                page: 1,
              })
            }
          >
            Clear filters
          </Button>
          <SheetClose render={<Button className="min-h-11" />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function ContentFiltersPanel({
  filters,
  onChange,
}: ContentListControls) {
  const [search, setSearch] = useState(filters.search)
  const input = useRef<HTMLInputElement>(null)
  useSearchShortcut(input)
  useEffect(() => setSearch(filters.search), [filters.search])
  useEffect(() => {
    if (search === filters.search) return
    const timer = setTimeout(() => onChange({ search, page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [search, filters.search, onChange])
  function clearSearch() {
    setSearch('')
    onChange({ search: '', page: 1 })
    input.current?.focus()
  }

  return (
    <FieldGroup className="mb-6 gap-4">
      <Field>
        <FieldLabel className="sr-only">Content type</FieldLabel>
        <ToggleGroup
          aria-label="Content type"
          value={[filters.type]}
          onValueChange={(values) => {
            if (isContentType(values[0])) onChange({ type: values[0], page: 1 })
          }}
          className="w-full sm:w-fit"
          spacing={1}
        >
          {contentTypes.map((type) => (
            <ToggleGroupItem
              className="min-h-11 flex-1 px-3 data-pressed:bg-primary/15 sm:flex-none"
              key={type}
              value={type}
            >
              {contentLabels[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <div className="flex items-start gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor="content-search" className="sr-only">
            Search content
          </FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <RiSearchLine aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={input}
              id="content-search"
              value={search}
              maxLength={200}
              placeholder="Search title or slug…  ( / )"
              aria-keyshortcuts="/"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && search !== '') {
                  event.preventDefault()
                  clearSearch()
                }
              }}
            />
            {search !== '' && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Clear search"
                  size="icon-xs"
                  className="size-10"
                  onClick={clearSearch}
                >
                  <RiCloseLine aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </Field>
        <MobileFilters filters={filters} onChange={onChange} />
      </div>
      <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <StatusFilter filters={filters} onChange={onChange} />
        <SortControls filters={filters} onChange={onChange} />
      </div>
    </FieldGroup>
  )
}
