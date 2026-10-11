import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RiPlayFill } from '@remixicon/react'
import { PublicShell } from './public-shell'
import { PublicPoster } from './public-poster'
import { PublicFailure } from './catalog-states'
import {
  BackToBrowse,
  DetailCta,
  DetailSkeleton,
  DetailSynopsis,
  DetailTitle,
  detailHeader,
  detailLayout,
  detailPosterSlot,
  detailTitleSlot,
} from './detail-layout'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { usePublicOnline } from '#/hooks/use-public-online'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import { contentDetailOptions } from '#/lib/catalog/content-queries'
import { videoOptions } from '#/lib/public/catalog-queries'
import { durationLabel } from '#/lib/public/catalog-model'
import type { PublicVideo } from '#/lib/public/catalog-model'

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
    <article className={detailLayout}>
      <div className={detailHeader}>
        <div className={detailPosterSlot}>
          <PublicPoster key={video.id} video={video} />
        </div>
        <div className={detailTitleSlot}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant="secondary">
              {video.kind === 'movie' ? 'Film' : 'Standalone'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {durationLabel(video.durationMs)}
            </span>
          </div>
          <DetailTitle>{video.title}</DetailTitle>
          {genres.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {genres.join(' · ')}
            </p>
          )}
        </div>
      </div>
      <DetailSynopsis text={video.synopsis} />
      <DetailCta>
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
      </DetailCta>
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
    online = usePublicOnline()
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
        <BackToBrowse />
        {!online && (
          <Alert role="status">
            <AlertTitle>You are offline.</AlertTitle>
            <AlertDescription>Reconnect to watch this video.</AlertDescription>
          </Alert>
        )}
        {!video ? (
          query.isFetching || (query.isPending && !status && online) ? (
            <DetailSkeleton label="Loading video" />
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
