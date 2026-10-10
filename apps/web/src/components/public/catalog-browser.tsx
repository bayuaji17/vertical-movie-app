import { useSiteSettings } from '#/hooks/use-site-settings'
import { PublicShell } from './public-shell'
import { BrowseCard } from './browse-card'
import { BrowseSearch } from './browse-search'
import { CatalogSkeleton, PublicFailure } from './catalog-states'
import { Button } from '#/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { usePublicCatalog } from '#/hooks/use-public-catalog'
import { useBrowseSearch } from '#/hooks/use-browse-search'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import { catalogType } from '#/lib/public/catalog-model'
import type { CatalogType } from '#/lib/public/catalog-model'

const quoted = (value: string) => `“${value}”`

export function CatalogBrowser({
  type,
  q,
  status,
}: {
  type: CatalogType
  q: string
  status: number | null
}) {
  const { settings } = useSiteSettings()
  const { query, items, total, online, more, refresh } = usePublicCatalog(
    type,
    q,
    status,
  )
  const search = useBrowseSearch(type, q)
  const searching = q !== ''
  const cursorInvalid =
    query.isFetchNextPageError &&
    query.error instanceof CatalogRequestError &&
    query.error.status === 422
  const summary = search.switching
    ? 'Searching…'
    : !query.data
      ? ''
      : searching
        ? `${total} ${total === 1 ? 'result' : 'results'} for ${quoted(q)}`
        : items.length
          ? `${total} ${total === 1 ? 'title' : 'titles'}`
          : ''
  return (
    <PublicShell type={type}>
      <section className="flex flex-col gap-6" aria-labelledby="browse-title">
        <div className="flex flex-col gap-3">
          <h1
            id="browse-title"
            className="font-heading text-4xl font-bold tracking-tight sm:text-5xl"
          >
            Browse
          </h1>
          {settings.tagline && (
            <p className="text-lg text-muted-foreground [overflow-wrap:anywhere]">
              {settings.tagline}
            </p>
          )}
        </div>
        {!online && (
          <Alert role="status">
            <AlertTitle>You are offline.</AlertTitle>
            <AlertDescription>
              Reconnect to search and load more stories.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup
            aria-label="Content type"
            value={[type]}
            onValueChange={(values) => {
              if (values[0]) search.changeType(catalogType(values[0]))
            }}
            className="w-fit flex-wrap"
            disabled={!online}
          >
            <ToggleGroupItem value="all" className="min-h-11">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="film" className="min-h-11">
              Films
            </ToggleGroupItem>
            <ToggleGroupItem value="standalone" className="min-h-11">
              Standalone
            </ToggleGroupItem>
            <ToggleGroupItem value="series" className="min-h-11">
              Series
            </ToggleGroupItem>
          </ToggleGroup>
          <BrowseSearch
            value={search.draft}
            pending={search.pending}
            disabled={!online}
            onChange={search.onChange}
            onCompositionStart={search.onCompositionStart}
            onCompositionEnd={search.onCompositionEnd}
            onClear={search.clear}
          />
        </div>
        <p
          aria-live="polite"
          className="min-h-6 text-sm text-muted-foreground [overflow-wrap:anywhere]"
        >
          {summary}
        </p>
        {query.data && query.isStale && !query.isFetching && (
          <Alert role="status">
            <AlertTitle>Showing previously loaded videos.</AlertTitle>
            <AlertDescription>
              <p>Refresh to see the latest.</p>
              <Button
                variant="outline"
                className="mt-3 min-h-11"
                disabled={!online}
                onClick={() => void refresh()}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {search.switching ? (
          <CatalogSkeleton count={10} />
        ) : !query.data ? (
          query.isFetching || (query.isPending && !status && online) ? (
            <CatalogSkeleton />
          ) : (
            <PublicFailure
              title={searching ? 'Could not search' : 'Could not load videos'}
              description="Please try again in a moment."
              action={searching ? 'Retry search' : 'Retry'}
              busy={!online}
              onRetry={() => void refresh()}
            />
          )
        ) : items.length === 0 ? (
          searching ? (
            <PublicFailure
              title={`No results for ${quoted(q)}`}
              description="Check the spelling or try a shorter word."
              action="Clear search"
              busy={!online}
              onRetry={search.clear}
            />
          ) : (
            <PublicFailure
              title={
                type === 'all' ? 'No videos yet' : 'No videos in this category'
              }
              description="Check back soon for more stories."
              action={type === 'all' ? 'Refresh' : 'Browse all'}
              busy={query.isFetching || !online}
              onRetry={() => {
                if (type === 'all') void refresh()
                else search.changeType('all')
              }}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-5">
              {items.map((item) => (
                <BrowseCard key={`${item.kind}:${item.id}`} item={item} />
              ))}
            </div>
            {query.isFetchingNextPage && <CatalogSkeleton count={5} />}
            <div
              className="flex flex-col items-center gap-3"
              aria-live="polite"
            >
              {query.isFetchNextPageError && (
                <p
                  role="status"
                  className="text-center text-sm text-muted-foreground"
                >
                  {cursorInvalid
                    ? 'This list has changed. Refresh to start again.'
                    : 'More videos could not be loaded. Your current videos are still here.'}
                </p>
              )}
              {query.hasNextPage || cursorInvalid ? (
                <Button
                  className="min-h-11"
                  disabled={query.isFetching || !online}
                  onClick={() => void (cursorInvalid ? refresh() : more())}
                >
                  {query.isFetchingNextPage
                    ? 'Loading…'
                    : cursorInvalid
                      ? 'Refresh list'
                      : query.isFetchNextPageError
                        ? 'Retry load more'
                        : 'Load more'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You’re all caught up.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </PublicShell>
  )
}
