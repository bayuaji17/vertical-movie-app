import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RiPlayFill, RiArrowLeftLine } from '@remixicon/react'
import { cn } from 'cn'
import { PublicShell } from './public-shell'
import { PublicPoster } from './public-poster'
import { PublicFailure } from './catalog-states'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { usePublicOnline } from '#/hooks/use-public-online'
import { useBrowseBack } from '#/hooks/use-browse-back'
import { useTextClamp } from '#/hooks/use-text-clamp'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import { contentDetailOptions } from '#/lib/catalog/content-queries'
import { videoOptions } from '#/lib/public/catalog-queries'
import { durationLabel } from '#/lib/public/catalog-model'
import type { PublicVideo } from '#/lib/public/catalog-model'

const layout =
  'grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-x-12 lg:gap-y-5'
const header =
  'grid grid-cols-[132px_minmax(0,1fr)] items-end gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-7 lg:contents'

function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading video"
      className={cn(layout, 'lg:gap-y-5')}
    >
      <div className={header}>
        <Skeleton className="aspect-[9/16] w-full rounded-2xl lg:col-start-1 lg:row-span-3 lg:row-start-1" />
        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full lg:h-14" />
        </div>
      </div>
      <Skeleton className="h-24 w-full lg:col-start-2 lg:row-start-2" />
    </div>
  )
}
function Synopsis({ text }: { text: string }) {
  const clamp = useTextClamp()
  return (
    <div className="flex min-w-0 flex-col items-start gap-1 lg:col-start-2 lg:row-start-2">
      <p
        ref={clamp.ref}
        className={cn(
          'max-w-2xl text-base leading-relaxed whitespace-pre-line text-muted-foreground [overflow-wrap:anywhere]',
          !clamp.expanded && 'line-clamp-4 lg:line-clamp-none',
        )}
      >
        {text}
      </p>
      {(clamp.overflowing || clamp.expanded) && (
        <Button
          variant="ghost"
          className="-ml-3 min-h-11 lg:hidden"
          aria-expanded={clamp.expanded}
          onClick={clamp.toggle}
        >
          {clamp.expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  )
}
function Detail({
  video,
  genres,
  online,
}: {
  video: PublicVideo
  genres: string[]
  online: boolean
}) {
  return (
    <article className={layout}>
      <div className={header}>
        <div className="lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <PublicPoster key={video.id} video={video} />
        </div>
        <div className="flex min-w-0 flex-col gap-2.5 lg:col-start-2 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant="secondary">
              {video.kind === 'movie' ? 'Film' : 'Standalone'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {durationLabel(video.durationMs)}
            </span>
          </div>
          <h1 className="font-heading text-3xl leading-tight font-bold [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
            {video.title}
          </h1>
          {genres.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {genres.join(' · ')}
            </p>
          )}
        </div>
      </div>
      <Synopsis text={video.synopsis} />
      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:col-start-2 lg:row-start-3">
        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={!online}
          nativeButton={false}
          role="link"
          render={
            <Link
              to="/watch/$slug"
              params={{ slug: video.slug }}
              preload={false}
            />
          }
        >
          <RiPlayFill data-icon="inline-start" aria-hidden="true" />
          Watch now
        </Button>
      </div>
    </article>
  )
}
export function VideoDetail({
  slug,
  status,
}: {
  slug: string
  status: number | null
}) {
  const client = useQueryClient(),
    options = videoOptions(slug),
    online = usePublicOnline(),
    back = useBrowseBack()
  const query = useQuery({
    ...options,
    enabled: online && (!status || !!client.getQueryData(options.queryKey)),
  })
  const video = query.data?.item,
    errorStatus =
      query.error instanceof CatalogRequestError ? query.error.status : status
  const missing = errorStatus === 404 || errorStatus === 422
  // Genres come from the catalog detail the loader already cached; never fetched here.
  const content = useQuery({
    ...contentDetailOptions(
      video && video.kind !== 'episode' ? video.kind : 'movie',
      slug,
    ),
    enabled: false,
  })
  const genres =
    video && content.data?.item.id === video.id
      ? content.data.item.genres.map((genre) => genre.name)
      : []
  return (
    <PublicShell>
      <section className="flex flex-col gap-6">
        <Link
          to="/"
          preload={false}
          onClick={back}
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
            <DetailSkeleton />
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
          <>
            <Detail video={video} genres={genres} online={online} />
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
          </>
        )}
      </section>
    </PublicShell>
  )
}
