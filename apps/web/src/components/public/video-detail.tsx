import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RiPlayFill, RiArrowLeftLine } from '@remixicon/react'
import { PublicShell } from './public-shell'
import { PublicPoster } from './public-poster'
import { PublicFailure } from './catalog-states'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { usePublicOnline } from '#/hooks/use-public-online'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import { videoOptions } from '#/lib/public/catalog-queries'
import { durationLabel } from '#/lib/public/catalog-model'
import type { CatalogType } from '#/lib/public/catalog-model'

export function VideoDetail({
  slug,
  type,
  status,
}: {
  slug: string
  type: CatalogType
  status: number | null
}) {
  const client = useQueryClient(),
    options = videoOptions(slug),
    online = usePublicOnline()
  const query = useQuery({
    ...options,
    enabled: online && (!status || !!client.getQueryData(options.queryKey)),
  })
  const video = query.data?.item,
    errorStatus =
      query.error instanceof CatalogRequestError ? query.error.status : status
  const missing = errorStatus === 404 || errorStatus === 422
  return (
    <PublicShell type={type}>
      <section className="flex flex-col gap-8">
        <Link
          to="/"
          search={{ type }}
          preload={false}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RiArrowLeftLine className="size-4" aria-hidden="true" />
          Back to browse
        </Link>
        {!online && (
          <Alert role="status">
            <AlertTitle>You are offline.</AlertTitle>
            <AlertDescription>Reconnect to watch this video.</AlertDescription>
          </Alert>
        )}
        {!video ? (
          query.isFetching || (query.isPending && !status && online) ? (
            <div
              role="status"
              aria-label="Loading video"
              className="flex flex-col gap-5"
            >
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="aspect-[9/16] w-full max-w-[360px]" />
            </div>
          ) : (
            <PublicFailure
              title={missing ? 'Video unavailable' : 'Could not load video'}
              description={
                missing
                  ? 'This video is no longer available in the public catalog.'
                  : 'Please try again in a moment.'
              }
              action="Retry video"
              busy={!online}
              onRetry={() => void query.refetch()}
            />
          )
        ) : (
          <div className="grid items-start gap-8 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12">
            <div className="order-1 flex min-w-0 flex-col items-start gap-5 md:order-2">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  {video.kind === 'movie' ? 'Film' : 'Standalone'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {durationLabel(video.durationMs)}
                </span>
              </div>
              <h1 className="font-heading text-4xl leading-tight font-bold break-words sm:text-5xl">
                {video.title}
              </h1>
              <p className="max-w-2xl whitespace-pre-line text-muted-foreground">
                {video.synopsis}
              </p>
              <Button
                className="min-h-11"
                disabled={!online}
                nativeButton={false}
                role="link"
                render={
                  <Link
                    to="/watch/$slug"
                    params={{ slug: video.slug }}
                    search={{ type }}
                    preload={false}
                  />
                }
              >
                <RiPlayFill data-icon="inline-start" aria-hidden="true" />
                Watch now
              </Button>
              {query.isStale && (
                <Alert role="status">
                  <AlertTitle>Showing previously loaded details.</AlertTitle>
                  <AlertDescription>
                    <Button
                      variant="outline"
                      className="mt-2 min-h-11"
                      disabled={!online || query.isFetching}
                      onClick={() => void query.refetch()}
                    >
                      Refresh details
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="order-2 w-full md:order-1">
              <PublicPoster key={video.id} video={video} />
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  )
}
