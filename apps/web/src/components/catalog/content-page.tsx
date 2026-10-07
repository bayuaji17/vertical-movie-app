import { Link, useNavigate } from '@tanstack/react-router'
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ContentKind } from '#/lib/catalog/content-model'
import type { ContentBootstrap } from '#/lib/catalog/content-queries'
import {
  contentDetailOptions,
  contentEpisodesOptions,
} from '#/lib/catalog/content-queries'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import {
  itemLength,
  genreLabels,
  kindLabels,
} from '#/lib/catalog/public-catalog-model'
import { PublicShell } from './public-shell'
import { Poster } from './poster'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'

export function ContentShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <PublicShell
      search={null}
      onHome={() => {
        void navigate({ to: '/' })
      }}
      onBrowse={() => {
        void navigate({ to: '/', hash: 'catalog' })
      }}
    >
      <section id="catalog" tabIndex={-1} className="flex flex-col gap-6">
        {children}
      </section>
    </PublicShell>
  )
}
export function ContentFailure({
  status,
  onRetry,
  busy,
}: {
  status: number
  onRetry: () => void
  busy: boolean
}) {
  const missing = status === 404 || status === 422
  return (
    <div role="status" className="rounded-2xl border p-6">
      <h1 className="font-heading text-2xl font-bold">
        {missing ? 'Title unavailable' : 'Unable to load this title'}
      </h1>
      <p className="my-4 text-muted-foreground">
        {missing
          ? 'This title is no longer available in the public catalog.'
          : 'Please try again in a moment.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" disabled={busy} onClick={onRetry}>
          Retry title
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          nativeButton={false}
          render={<Link to="/" />}
        >
          Back to catalog
        </Button>
      </div>
    </div>
  )
}
export function ContentLoading() {
  return (
    <div
      role="status"
      aria-label="Loading title"
      className="grid gap-6 sm:grid-cols-[180px_1fr]"
    >
      <Skeleton className="aspect-[9/16] w-40" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}
export function ContentPage({
  kind,
  slug,
  bootstrap,
}: {
  kind: ContentKind
  slug: string
  bootstrap: ContentBootstrap
}) {
  const client = useQueryClient(),
    options = contentDetailOptions(kind, slug)
  const query = useQuery({
    ...options,
    enabled: !bootstrap.detailStatus || !!client.getQueryData(options.queryKey),
  })
  const item = query.data?.item
  const status =
    query.error instanceof CatalogRequestError
      ? query.error.status
      : (bootstrap.detailStatus ?? 503)
  return (
    <ContentShell>
      <Link
        to="/"
        className="inline-flex min-h-11 w-fit items-center text-sm underline underline-offset-4"
      >
        Back to catalog
      </Link>
      {!item ? (
        query.fetchStatus === 'fetching' ||
        (!query.isError && !bootstrap.detailStatus) ? (
          <ContentLoading />
        ) : (
          <ContentFailure
            status={status}
            busy={query.isFetching}
            onRetry={() => {
              void query.refetch()
            }}
          />
        )
      ) : (
        <>
          <div className="grid items-start gap-7 sm:grid-cols-[180px_1fr] lg:grid-cols-[240px_1fr]">
            <div className="w-40 sm:w-full">
              <Poster item={item} eager />
            </div>
            <div className="flex min-w-0 flex-col items-start gap-5">
              <Badge variant="secondary">{kindLabels[item.kind]}</Badge>
              <h1 className="font-heading text-3xl font-bold break-words sm:text-4xl">
                {item.title}
              </h1>
              <p className="max-w-3xl whitespace-pre-line text-muted-foreground">
                {item.synopsis}
              </p>
              <p>
                {genreLabels(item)}
                {item.genres.length ? ' · ' : ''}
                {itemLength(item)}
              </p>
              {item.kind !== 'series' && (
                <Button
                  className="min-h-11"
                  nativeButton={false}
                  render={
                    <Link
                      to="/watch/$slug"
                      params={{ slug: item.slug }}
                      preload={false}
                    />
                  }
                >
                  Watch now
                </Button>
              )}
            </div>
          </div>
          {item.kind === 'series' && (
            <EpisodeList
              key={item.id}
              slug={slug}
              bootstrapStatus={bootstrap.episodesStatus}
            />
          )}
        </>
      )}
    </ContentShell>
  )
}
function EpisodeList({
  slug,
  bootstrapStatus,
}: {
  slug: string
  bootstrapStatus: number | null
}) {
  const client = useQueryClient(),
    options = contentEpisodesOptions(slug)
  const query = useInfiniteQuery({
    ...options,
    enabled: !bootstrapStatus || !!client.getQueryData(options.queryKey),
  })
  const episodes = [
    ...new Map(
      query.data?.pages
        .flatMap((p) => p.items)
        .map((item) => [item.id, item]) ?? [],
    ).values(),
  ]
  const seasons = [...new Set(episodes.map((item) => item.seasonNumber))]
  const total = query.data?.pages.at(-1)?.total ?? 0
  const invalid =
    query.isFetchNextPageError &&
    query.error instanceof CatalogRequestError &&
    query.error.status === 422
  const busy = query.isFetching || query.fetchStatus === 'paused'
  const pendingCount = query.data
    ? Math.min(20, Math.max(0, total - episodes.length))
    : 20
  async function restart() {
    await client.cancelQueries({ queryKey: options.queryKey, exact: true })
    await client.resetQueries({ queryKey: options.queryKey, exact: true })
    if (bootstrapStatus) await query.refetch()
  }
  return (
    <section aria-label="Episodes" className="flex flex-col gap-5">
      <h2 className="font-heading text-2xl font-bold">Episodes</h2>
      {query.data && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {episodes.length} episodes loaded · {total} available
        </p>
      )}
      {seasons.map((number) => (
        <section
          key={number}
          aria-label={'Season ' + number}
          className="space-y-3"
        >
          <h3 className="font-heading text-lg font-semibold">
            Season {number}
          </h3>
          <ul className="space-y-3">
            {episodes
              .filter((item) => item.seasonNumber === number)
              .map((item) => (
                <li key={item.id}>
                  <Link
                    to="/watch/$slug"
                    params={{ slug: item.slug }}
                    preload={false}
                    className="flex min-h-11 flex-col gap-2 rounded-2xl border p-4 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-xs text-muted-foreground">
                      Season {item.seasonNumber} · Episode {item.episodeNumber}{' '}
                      · {Math.ceil(item.durationMs / 60000)} min
                    </span>
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.synopsis}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      {query.isFetching && (
        <div
          role="status"
          aria-label={query.data ? 'Loading more episodes' : 'Loading episodes'}
          className="space-y-3"
        >
          {Array.from({ length: pendingCount }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}
      {query.fetchStatus === 'paused' && (
        <p role="status">
          Connection paused. Episodes will resume when you are online.
        </p>
      )}
      {query.data && episodes.length === 0 && (
        <p role="status">No episodes are currently available.</p>
      )}
      {(query.isError ||
        (!query.data && bootstrapStatus && !query.isFetching)) && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-2xl border p-4"
        >
          <p>
            {invalid
              ? 'This episode list has changed. Refresh to start again.'
              : 'Episodes are temporarily unavailable.'}
          </p>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (invalid) void restart()
              else if (query.isFetchNextPageError)
                void query.fetchNextPage({ cancelRefetch: false })
              else void query.refetch()
            }}
          >
            {invalid ? 'Refresh episodes' : 'Retry episodes'}
          </Button>
        </div>
      )}
      {query.hasNextPage && !query.isFetchNextPageError && (
        <Button
          className="min-h-11 self-center"
          variant="outline"
          disabled={busy}
          onClick={() => {
            void query.fetchNextPage({ cancelRefetch: false })
          }}
        >
          {query.isFetchingNextPage
            ? 'Loading episodes…'
            : 'Load more episodes'}
        </Button>
      )}
    </section>
  )
}
