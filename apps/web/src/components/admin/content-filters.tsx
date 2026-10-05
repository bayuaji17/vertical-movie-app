import { useState, useEffect } from 'react'
import { RiSearchLine } from '@remixicon/react'
import {
  contentTypes,
  contentLabels,
  isContentType,
} from '#/lib/admin/content-client'
import type { ContentListControls } from '#/lib/admin/content-list-state'
import { FieldGroup, Field, FieldLabel } from '#/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Checkbox } from '#/components/ui/checkbox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'

export function ContentFiltersPanel({
  filters,
  onChange,
}: ContentListControls) {
  const [search, setSearch] = useState(filters.search)
  useEffect(() => setSearch(filters.search), [filters.search])
  useEffect(() => {
    if (search === filters.search) return
    const timer = setTimeout(() => onChange({ search, page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [search, filters.search, onChange])

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
      <Field>
        <FieldLabel htmlFor="content-search" className="sr-only">
          Search content
        </FieldLabel>
        <InputGroup className="h-11">
          <InputGroupAddon>
            <RiSearchLine aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id="content-search"
            value={search}
            maxLength={200}
            placeholder="Search content..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id="include-archived"
          checked={filters.includeArchived}
          onCheckedChange={(checked) =>
            onChange({ includeArchived: checked, page: 1 })
          }
        />
        <FieldLabel htmlFor="include-archived" className="min-h-11">
          Include archived
        </FieldLabel>
      </Field>
    </FieldGroup>
  )
}
