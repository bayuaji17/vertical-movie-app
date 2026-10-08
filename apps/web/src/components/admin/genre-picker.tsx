import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { genreOptions } from '#/lib/admin/content-queries'
import { useContentApi } from '#/hooks/use-content-api'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Field, FieldLabel } from '#/components/ui/field'

export function GenrePicker({
  value,
  onChange,
  disabled,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  disabled: boolean
}) {
  const { client, identity } = useContentApi()
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [known, setKnown] = useState<Record<string, string>>({})
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const query = useInfiniteQuery(genreOptions(client, identity, debounced))
  const pages = query.data?.pages
  useEffect(() => {
    if (pages)
      setKnown((previous) => ({
        ...previous,
        ...Object.fromEntries(
          pages.flatMap((p) => p.items.map((item) => [item.id, item.name])),
        ),
      }))
  }, [pages])
  const items = Array.from(
    new Map(
      pages?.flatMap((p) => p.items.map((item) => [item.id, item] as const)) ??
        [],
    ).values(),
  )
  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="genre-search">Search genres</FieldLabel>
        <Input
          id="genre-search"
          className="h-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
      </Field>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Selected genres">
          {value.map((id) => (
            <Button
              key={id}
              type="button"
              variant="secondary"
              className="min-h-11 max-w-full whitespace-normal break-all"
              disabled={disabled}
              onClick={() =>
                onChange(value.filter((selected) => selected !== id))
              }
            >
              Remove {known[id] ?? `genre ${id}`}
            </Button>
          ))}
        </div>
      )}
      {query.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading genres...
        </p>
      )}
      {query.isError && (
        <div role="alert" className="text-sm">
          <p>
            {contentErrorMessage(query.error)} Your selected genres are
            retained.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 min-h-11"
            disabled={query.isFetching || disabled}
            onClick={() => void query.refetch()}
          >
            Retry genres
          </Button>
        </div>
      )}
      {!query.isPending && items.length === 0 && !query.isError && (
        <p className="text-sm text-muted-foreground">
          No genres found. You can save a draft without genres.
        </p>
      )}
      <div className="grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2"
          >
            <Checkbox
              id={`genre-option-${item.id}`}
              checked={value.includes(item.id)}
              disabled={
                disabled || (!value.includes(item.id) && value.length >= 100)
              }
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...value, item.id]
                    : value.filter((id) => id !== item.id),
                )
              }
            />
            <FieldLabel
              htmlFor={`genre-option-${item.id}`}
              className="min-h-11 flex-1 cursor-pointer items-center break-words text-sm"
            >
              {item.name}
            </FieldLabel>
          </div>
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={query.isFetchingNextPage || disabled}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading...' : 'Load more genres'}
        </Button>
      )}
    </div>
  )
}
