import { useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { PublicShell } from './public-shell'
import { CatalogCard } from './catalog-card'
import { CatalogSkeleton, PublicFailure } from './catalog-states'
import { Button } from '#/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { usePublicCatalog } from '#/hooks/use-public-catalog'
import { catalogKey } from '#/lib/public/catalog-queries'
import { catalogType } from '#/lib/public/catalog-model'
import type { CatalogType } from '#/lib/public/catalog-model'

export function CatalogBrowser({
  type,
  status,
}: {
  type: CatalogType
  status: number | null
}) {
  const { query, items, online, more, refresh, client } = usePublicCatalog(
    type,
    status,
  )
  const navigate = useNavigate(),
    revision = useRef(0)
  const change = async (next: CatalogType) => {
    if (next === type || !online) return
    const request = ++revision.current
    await client.cancelQueries({ queryKey: catalogKey(type), exact: true })
    if (request !== revision.current) return
    await client.cancelQueries({ queryKey: catalogKey(next), exact: true })
    if (request !== revision.current) return
    client.removeQueries({ queryKey: catalogKey(next), exact: true })
    await navigate({ to: '/', search: { type: next } })
  }
  return (
    <PublicShell type={type}>
      <section className="flex flex-col gap-8" aria-labelledby="browse-title">
        <div className="flex flex-col gap-3">
          <h1
            id="browse-title"
            className="font-heading text-4xl font-bold tracking-tight sm:text-5xl"
          >
            Browse
          </h1>
          <p className="text-lg text-muted-foreground">Find your next story.</p>
        </div>
        <ToggleGroup
          aria-label="Content type"
          value={[type]}
          onValueChange={(values) => {
            if (values[0]) void change(catalogType(values[0]))
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
        </ToggleGroup>
        {!online && (
          <Alert role="status">
            <AlertTitle>You are offline.</AlertTitle>
            <AlertDescription>Reconnect to load more stories.</AlertDescription>
          </Alert>
        )}
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
        {!query.data ? (
          query.isFetching || (query.isPending && !status && online) ? (
            <CatalogSkeleton />
          ) : (
            <PublicFailure
              title="Could not load videos"
              description="Please try again in a moment."
              action="Retry"
              busy={!online}
              onRetry={() => void refresh()}
            />
          )
        ) : items.length === 0 ? (
          <PublicFailure
            title={
              type === 'all' ? 'No videos yet' : 'No videos in this category'
            }
            description="Check back soon for more stories."
            action={type === 'all' ? 'Refresh' : 'Browse all'}
            busy={query.isFetching || !online}
            onRetry={() => {
              if (type === 'all') void refresh()
              else void change('all')
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-5">
              {items.map((video) => (
                <CatalogCard
                  key={video.id}
                  video={video}
                  renderLink={(children, className) => {
                    const path: string = '/videos/' + video.slug
                    return (
                      <Link
                        to={path}
                        search={{ type }}
                        preload={false}
                        className={className}
                      >
                        {children}
                      </Link>
                    )
                  }}
                />
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
                  More videos could not be loaded. Your current videos are still
                  here.
                </p>
              )}
              {query.hasNextPage ? (
                <Button
                  className="min-h-11"
                  disabled={query.isFetching || !online}
                  onClick={() => void more()}
                >
                  {query.isFetchingNextPage
                    ? 'Loading…'
                    : query.isFetchNextPageError
                      ? 'Retry load more'
                      : 'Load more'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You’re all caught up.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {items.length} videos
              </p>
            </div>
          </>
        )}
      </section>
    </PublicShell>
  )
}
