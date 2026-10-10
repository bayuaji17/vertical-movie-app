import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { useGenresApi } from '#/hooks/use-genres-api'
import {
  atGenreLimit,
  genreLimit,
  mergeKnown,
  offeredGenreName,
  selectionSummary,
  toggleGenre,
} from '#/lib/admin/genre-picker-state'
import { submitGenre } from '#/lib/admin/genres-actions'
import { genreErrorMessage } from '#/lib/admin/genres-form'
import {
  createGenreOptions,
  genreListOptions,
  invalidateGenres,
} from '#/lib/admin/genres-queries'

export function GenrePicker({
  value,
  onChange,
  disabled,
  knownGenres = [],
}: {
  value: string[]
  onChange: (ids: string[]) => void
  disabled: boolean
  knownGenres?: Array<{ id: string; name: string }>
}) {
  const { client, identity, queryClient } = useGenresApi()
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [known, setKnown] = useState<Record<string, string>>(() =>
      mergeKnown({}, knownGenres),
    ),
    [createError, setCreateError] = useState<string>()
  const create = useMutation(createGenreOptions(client, identity))
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const query = useInfiniteQuery(genreListOptions(client, identity, debounced))
  const pages = query.data?.pages
  useEffect(() => {
    if (pages)
      setKnown((previous) =>
        mergeKnown(
          previous,
          pages.flatMap((p) => p.items),
        ),
      )
  }, [pages])
  const items = useMemo(
    () =>
      Array.from(
        new Map(
          pages?.flatMap((p) =>
            p.items.map((item) => [item.id, item] as const),
          ) ?? [],
        ).values(),
      ),
    [pages],
  )
  const full = atGenreLimit(value.length)
  const offered = offeredGenreName(search, items, value.length)

  async function createInline(name: string) {
    setCreateError(undefined)
    const outcome = await submitGenre((input) => create.mutateAsync(input), {
      name,
      slug: '',
      slugTouched: false,
    })
    if (outcome.status === 'saved') {
      setKnown((previous) => mergeKnown(previous, [outcome.genre]))
      onChange(toggleGenre(value, outcome.genre.id, true))
      setSearch('')
      setDebounced('')
      await invalidateGenres(queryClient, identity)
    } else if (outcome.status === 'failed') {
      setCreateError(outcome.slugError ?? outcome.message)
    } else {
      setCreateError(outcome.nameError ?? outcome.slugError)
    }
  }
  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="genre-search">Search genres</FieldLabel>
        <Input
          id="genre-search"
          className="h-11"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCreateError(undefined)
          }}
          disabled={disabled}
        />
      </Field>
      <p role="status" className="text-sm text-muted-foreground">
        {selectionSummary(value.length)}
      </p>
      {full && (
        <p role="status" className="text-sm">
          You have reached the limit of {genreLimit} genres. Remove one to add
          another.
        </p>
      )}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Selected genres">
          {value.map((id) => (
            <li key={id} className="max-w-full">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 max-w-full whitespace-normal break-all"
                disabled={disabled}
                onClick={() => onChange(toggleGenre(value, id, false))}
              >
                Remove {known[id] ?? `genre ${id}`}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {query.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading genres...
        </p>
      )}
      {query.isError && (
        <div role="alert" className="text-sm">
          <p>
            {genreErrorMessage(query.error)} Your selected genres are retained.
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
      {!query.isPending && items.length === 0 && !query.isError && !offered && (
        <p className="text-sm text-muted-foreground">
          No genres found. You can save a draft without genres.
        </p>
      )}
      {offered && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 max-w-full whitespace-normal break-all"
          disabled={disabled || create.isPending || !client}
          onClick={() => void createInline(offered)}
        >
          {create.isPending ? 'Creating…' : `Create “${offered}”`}
        </Button>
      )}
      {createError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Genre not created</AlertTitle>
          <AlertDescription>
            {createError} Your selected genres are retained.
          </AlertDescription>
        </Alert>
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
              disabled={disabled || (!value.includes(item.id) && full)}
              onCheckedChange={(checked) =>
                onChange(toggleGenre(value, item.id, checked))
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
