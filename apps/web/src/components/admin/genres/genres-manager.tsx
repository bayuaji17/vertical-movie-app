import { useEffect, useId, useRef, useState } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { toast } from '#/components/ui/toast'
import { AdminPageHeading } from '../page-heading'
import { useGenresApi } from '#/hooks/use-genres-api'
import { usePublicOnline } from '#/hooks/use-public-online'
import { effectiveSlug, submitGenre } from '#/lib/admin/genres-actions'
import type { GenreFormValues } from '#/lib/admin/genres-actions'
import type { Genre, GenresClient } from '#/lib/admin/genres-client'
import { genreErrorMessage } from '#/lib/admin/genres-form'
import {
  createGenreOptions,
  genreListOptions,
  invalidateGenres,
} from '#/lib/admin/genres-queries'

export function GenresPage() {
  const { client, identity } = useGenresApi()
  const online = usePublicOnline()
  return <GenresManager client={client} identity={identity} online={online} />
}

export function GenresManager({
  client,
  identity,
  online,
}: {
  client: GenresClient | undefined
  identity: string
  online: boolean
}) {
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const query = useInfiniteQuery(genreListOptions(client, identity, debounced))
  const items = Array.from(
    new Map(
      query.data?.pages.flatMap((page) =>
        page.items.map((item) => [item.id, item] as const),
      ) ?? [],
    ).values(),
  )
  const canEdit = client?.canEdit ?? false
  return (
    <>
      <AdminPageHeading
        title="Genres"
        description="Organize content with genres. A video or series can have several."
      />
      {!online && (
        <Alert className="mb-6" role="status">
          <AlertTitle>You are offline</AlertTitle>
          <AlertDescription>
            Reconnect to search, add or load more genres.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-label="Genre list"
          className="order-2 flex min-w-0 flex-col gap-4 lg:order-1"
        >
          <Field>
            <FieldLabel htmlFor="genre-list-search">Search genres</FieldLabel>
            <Input
              id="genre-list-search"
              type="search"
              className="h-11"
              value={search}
              disabled={!online}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <GenreList
            query={query}
            items={items}
            searching={debounced.length > 0}
            canEdit={canEdit}
            online={online}
          />
        </section>
        <div className="order-1 lg:order-2">
          <AddGenreCard client={client} identity={identity} online={online} />
        </div>
      </div>
    </>
  )
}

function GenreList({
  query,
  items,
  searching,
  canEdit,
  online,
}: {
  query: ReturnType<
    typeof useInfiniteQuery<
      Awaited<ReturnType<GenresClient['list']>>,
      Error,
      { pages: Array<Awaited<ReturnType<GenresClient['list']>>> },
      readonly unknown[],
      string | undefined
    >
  >
  items: Genre[]
  searching: boolean
  canEdit: boolean
  online: boolean
}) {
  const noteId = useId()
  if (query.isPending)
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Loading genres…</span>
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    )
  return (
    <>
      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>Genres could not be loaded</AlertTitle>
          <AlertDescription>
            <p>{genreErrorMessage(query.error)}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11"
              disabled={query.isFetching || !online}
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {items.length === 0 && !query.isError ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>
              {searching ? 'No genres match' : 'No genres yet'}
            </EmptyTitle>
            <EmptyDescription>
              {searching
                ? 'Try a different search.'
                : 'Add your first genre to start organizing content.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Showing {items.length} {items.length === 1 ? 'genre' : 'genres'}
            {query.hasNextPage ? ' so far' : ''}.
          </p>
          {!canEdit && items.length > 0 && (
            <p id={noteId} className="text-sm text-muted-foreground">
              Renaming and deleting genres isn&apos;t available yet.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {items.map((genre) => (
              <li key={genre.id}>
                <GenreRow
                  genre={genre}
                  canEdit={canEdit}
                  noteId={canEdit ? undefined : noteId}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          disabled={query.isFetchingNextPage || !online}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more genres'}
        </Button>
      )}
    </>
  )
}

function GenreRow({
  genre,
  canEdit,
  noteId,
}: {
  genre: Genre
  canEdit: boolean
  noteId?: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="break-words font-medium">{genre.name}</p>
          <p className="break-all text-sm text-muted-foreground">
            <code>{genre.slug}</code> · Created{' '}
            <time dateTime={genre.createdAt}>
              {genre.createdAt.slice(0, 10)}
            </time>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={!canEdit}
            aria-describedby={noteId}
            aria-label={`Rename ${genre.name}`}
          >
            Rename
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={!canEdit}
            aria-describedby={noteId}
            aria-label={`Delete ${genre.name}`}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AddGenreCard({
  client,
  identity,
  online,
}: {
  client: GenresClient | undefined
  identity: string
  online: boolean
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation(createGenreOptions(client, identity))
  const [values, setValues] = useState<GenreFormValues>({
    name: '',
    slug: '',
    slugTouched: false,
  })
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const [notice, setNotice] = useState<string>()
  const nameRef = useRef<HTMLInputElement>(null)
  const pending = useRef(false)
  const busy = mutation.isPending
  const slug = effectiveSlug(values)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setNotice(undefined)
    try {
      const outcome = await submitGenre(
        (input) => mutation.mutateAsync(input),
        values,
      )
      if (outcome.status === 'invalid') {
        setErrors({ name: outcome.nameError, slug: outcome.slugError })
        return
      }
      if (outcome.status === 'failed') {
        setErrors({ slug: outcome.slugError })
        if (!outcome.slugError) setNotice(outcome.message)
        return
      }
      setErrors({})
      setValues({ name: '', slug: '', slugTouched: false })
      toast.add({
        title: 'Genre added',
        description: `${outcome.genre.name} is ready to use.`,
        type: 'success',
      })
      await invalidateGenres(queryClient, identity)
      nameRef.current?.focus()
    } finally {
      pending.current = false
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add genre</CardTitle>
        <CardDescription>
          The slug is created from the name unless you change it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5"
        >
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="genre-name">Name</FieldLabel>
            <Input
              id="genre-name"
              ref={nameRef}
              className="h-11"
              value={values.name}
              disabled={busy}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'genre-name-error' : undefined}
              onChange={(event) => {
                setValues({ ...values, name: event.target.value })
                if (errors.name) setErrors({ ...errors, name: undefined })
              }}
            />
            {errors.name && (
              <FieldError
                id="genre-name-error"
                errors={[{ message: errors.name }]}
              />
            )}
          </Field>
          <Field data-invalid={!!errors.slug}>
            <FieldLabel htmlFor="genre-slug">Slug</FieldLabel>
            <Input
              id="genre-slug"
              className="h-11"
              value={slug}
              disabled={busy}
              spellCheck={false}
              autoCapitalize="none"
              aria-invalid={!!errors.slug}
              aria-describedby={
                errors.slug ? 'genre-slug-error' : 'genre-slug-hint'
              }
              onChange={(event) => {
                setValues({
                  ...values,
                  slug: event.target.value,
                  slugTouched: true,
                })
                if (errors.slug) setErrors({ ...errors, slug: undefined })
              }}
            />
            {errors.slug ? (
              <FieldError
                id="genre-slug-error"
                errors={[{ message: errors.slug }]}
              />
            ) : (
              <FieldDescription id="genre-slug-hint">
                Lowercase letters, numbers and hyphens.
              </FieldDescription>
            )}
          </Field>
          {notice && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Genre not added</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="min-h-11" disabled={busy || !online}>
            {busy ? 'Adding…' : 'Add genre'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
