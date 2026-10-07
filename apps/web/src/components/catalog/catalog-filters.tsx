import { RiSearchLine } from '@remixicon/react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Field, FieldLabel } from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { catalogData } from '#/lib/catalog/catalog-data'
import type { CatalogFilters as Filters } from '#/lib/catalog/catalog-selectors'

export function CatalogSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <InputGroup className="h-11">
      <InputGroupInput
        id="catalog-search"
        type="search"
        className="h-11"
        aria-label="Search titles"
        placeholder="Search titles..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <InputGroupAddon>
        <RiSearchLine aria-hidden="true" />
      </InputGroupAddon>
    </InputGroup>
  )
}
export function CatalogFilters({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (filters: Filters) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/60 p-2">
      <ToggleGroup
        aria-label="Content type"
        value={[filters.kind]}
        onValueChange={(values) => {
          if (values[0])
            onChange({ ...filters, kind: values[0] as Filters['kind'] })
        }}
        className="flex-wrap"
      >
        <ToggleGroupItem value="all" className="min-h-11">
          All
        </ToggleGroupItem>
        <ToggleGroupItem value="movie" className="min-h-11">
          Film
        </ToggleGroupItem>
        <ToggleGroupItem value="series" className="min-h-11">
          Series
        </ToggleGroupItem>
        <ToggleGroupItem value="standalone" className="min-h-11">
          Standalone
        </ToggleGroupItem>
      </ToggleGroup>
      <Field className="w-auto">
        <FieldLabel htmlFor="catalog-genre" className="sr-only">
          Genre
        </FieldLabel>
        <NativeSelect
          id="catalog-genre"
          value={filters.genreId}
          onChange={(event) =>
            onChange({ ...filters, genreId: event.target.value })
          }
          className="[&_select]:h-11"
        >
          <NativeSelectOption value="all">All genres</NativeSelectOption>
          {catalogData.genres.map((genre) => (
            <NativeSelectOption value={genre.id} key={genre.id}>
              {genre.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <p className="ml-auto px-2 text-xs text-muted-foreground">
        Latest releases
      </p>
    </div>
  )
}
