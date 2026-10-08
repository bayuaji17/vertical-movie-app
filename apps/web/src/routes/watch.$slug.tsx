import { useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ContentShell,
  ContentLoading,
  ContentFailure,
} from '#/components/catalog/content-page'
import { VerticalVideoPlayer } from '#/components/vertical-video-player'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import {
  loadWatchMetadata,
  watchMetadataOptions,
  nextEpisodeOptions,
  publicContentBrowser,
} from '#/lib/catalog/content-queries'
import type { WatchVideo } from '#/lib/catalog/content-model'

export const Route = createFileRoute('/watch/$slug')({
  loader: ({ context, params }) =>
    loadWatchMetadata(context.queryClient, params.slug),
  head: () => ({ meta: [{ title: 'Watch — Vertical Movie' }] }),
  component: Watch,
})
function Watch() {
  const { slug } = Route.useParams(),
    bootstrap = Route.useLoaderData()
  const client = useQueryClient(),
    options = watchMetadataOptions(slug)
  const query = useQuery({
    ...options,
    enabled: !bootstrap.status || !!client.getQueryData(options.queryKey),
  })
  const status =
    query.error instanceof CatalogRequestError
      ? query.error.status
      : (bootstrap.status ?? 503)
  return (
    <ContentShell>
      {query.data ? (
        <WatchContent key={query.data.item.id} video={query.data.item} />
      ) : query.isFetching || (!query.isError && !bootstrap.status) ? (
        <ContentLoading />
      ) : (
        <ContentFailure
          status={status}
          busy={query.isFetching}
          onRetry={() => {
            void query.refetch()
          }}
        />
      )}
    </ContentShell>
  )
}
function WatchContent({ video }: { video: WatchVideo }) {
  const load = useCallback(
    (signal: AbortSignal) =>
      publicContentBrowser().playback(video.slug, video.id, signal),
    [video.slug, video.id],
  )
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {video.kind === 'episode' && video.seriesSlug ? (
          <Button
            variant="outline"
            className="min-h-11"
            nativeButton={false}
            role="link"
            render={
              <Link to="/series/$slug" params={{ slug: video.seriesSlug }} />
            }
          >
            Back to series
          </Button>
        ) : (
          video.kind !== 'episode' && (
            <Button
              variant="outline"
              className="min-h-11"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/titles/$kind/$slug"
                  params={{ kind: video.kind, slug: video.slug }}
                />
              }
            >
              Back to details
            </Button>
          )
        )}
        <Button
          variant="ghost"
          className="min-h-11"
          nativeButton={false}
          role="link"
          render={<Link to="/" />}
        >
          Back to catalog
        </Button>
      </div>
      <div className="grid items-start gap-7 md:grid-cols-[minmax(240px,360px)_1fr]">
        <div className="mx-auto w-full max-w-[360px]">
          <VerticalVideoPlayer key={video.id} loadPlayback={load} />
        </div>
        <div className="flex min-w-0 flex-col items-start gap-5">
          <Badge variant="secondary">
            {video.kind === 'movie'
              ? 'Film'
              : video.kind === 'standalone'
                ? 'Standalone'
                : 'Episode'}
          </Badge>
          <h1 className="font-heading text-3xl font-bold break-words">
            {video.title}
          </h1>
          <p className="max-w-2xl whitespace-pre-line text-muted-foreground">
            {video.synopsis}
          </p>
          <p className="text-sm text-muted-foreground">
            {video.kind === 'episode'
              ? 'Season ' +
                video.seasonNumber +
                ' · Episode ' +
                video.episodeNumber +
                ' · '
              : ''}
            {Math.ceil(video.durationMs / 60000)} min
          </p>
          {video.kind === 'episode' &&
            video.seriesSlug &&
            video.seasonNumber &&
            video.episodeNumber && (
              <NextEpisode
                key={video.id}
                video={video}
                seriesSlug={video.seriesSlug}
                season={video.seasonNumber}
                episode={video.episodeNumber}
              />
            )}
        </div>
      </div>
    </>
  )
}
function NextEpisode({
  video,
  seriesSlug,
  season,
  episode,
}: {
  video: WatchVideo
  seriesSlug: string
  season: number
  episode: number
}) {
  const next = useQuery(
    nextEpisodeOptions(video.slug, seriesSlug, season, episode),
  )
  if (next.isError)
    return (
      <div role="status" className="space-y-3">
        <p>The next episode is temporarily unavailable.</p>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={next.isFetching}
          onClick={() => {
            void next.refetch()
          }}
        >
          Retry next episode
        </Button>
      </div>
    )
  if (next.isPending || next.isFetching)
    return <p role="status">Checking next episode…</p>
  return next.data ? (
    <Button
      className="min-h-11"
      nativeButton={false}
      role="link"
      render={
        <Link
          to="/watch/$slug"
          params={{ slug: next.data.slug }}
          preload={false}
        />
      }
    >
      Next episode · S{next.data.seasonNumber} E{next.data.episodeNumber}
    </Button>
  ) : (
    <p role="status">No more episodes are currently available.</p>
  )
}
