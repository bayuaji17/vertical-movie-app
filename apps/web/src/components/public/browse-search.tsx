import { RiCloseLine, RiLoader4Line, RiSearchLine } from '@remixicon/react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import { searchMaxLength } from '#/lib/public/catalog-model'

export function BrowseSearch({
  value,
  pending,
  disabled,
  onChange,
  onCompositionStart,
  onCompositionEnd,
  onClear,
}: {
  value: string
  pending: boolean
  disabled: boolean
  onChange: (value: string) => void
  onCompositionStart: () => void
  onCompositionEnd: (value: string) => void
  onClear: () => void
}) {
  return (
    <div role="search" className="w-full sm:w-[340px]">
      <InputGroup className="h-11">
        <InputGroupInput
          id="browse-search"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={searchMaxLength}
          className="h-11 [&::-webkit-search-cancel-button]:hidden"
          aria-label="Search videos"
          placeholder="Search titles and synopsis"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={(event) =>
            onCompositionEnd(event.currentTarget.value)
          }
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault()
              onClear()
            }
          }}
        />
        <InputGroupAddon>
          <RiSearchLine aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          {pending && (
            <RiLoader4Line
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {value && !disabled && (
            <InputGroupButton
              aria-label="Clear search"
              size="icon-sm"
              className="size-10"
              onClick={() => {
                onClear()
                document.getElementById('browse-search')?.focus()
              }}
            >
              <RiCloseLine aria-hidden="true" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
