import {
  publicTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ContentFailure } from '#/components/catalog/content-page'
import { cn } from 'cn'
import { Skeleton } from '#/components/ui/skeleton'
import { WatchShell } from '#/components/public/watch-shell'
import { EpisodePanel } from '#/components/public/episode-panel'
import { useEpisodeNav } from '#/hooks/use-episode-nav'
import type { EpisodeNav } from '#/hooks/use-episode-nav'
import { episodeLabel } from '#/lib/catalog/season-model'
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiPlayFill,
} from '@remixicon/react'
import { ClampedText } from '#/components/public/detail-layout'
import { stripLegacyTypeSearch } from '#/lib/public/catalog-navigation'
import { isMissingContent } from '#/lib/public/missing-content'
import { usePublicOnline } from '#/hooks/use-public-online'
import { VerticalVideoPlayer } from '#/components/vertical-video-player'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import {
  loadWatchMetadata,
  watchMetadataOptions,
  loadEpisodeContext,
  publicContentBrowser,
} from '#/lib/catalog/content-queries'
import type { PublicEpisode, WatchVideo } from '#/lib/catalog/content-model'
import {
  watchBackTarget,
  watchHeadline,
  watchKindLabel,
} from '#/lib/catalog/watch-model'

export const Route = createFileRoute('/watch/$slug')({
  beforeLoad: ({ location }) => stripLegacyTypeSearch(location),
  loader: async ({ context, params }) => {
    const result = await loadWatchMetadata(context.queryClient, params.slug)
    if (isMissingContent(result.status)) throw notFound()
    const video = context.queryClient.getQueryData<{ item: WatchVideo }>(
      watchMetadataOptions(params.slug).queryKey,
    )?.item
    if (!result.status && video?.kind === 'episode' && video.seriesSlug)
      await loadEpisodeContext(context.queryClient, video.seriesSlug)
    return {
      ...result,
      metadata: video
        ? { title: video.title, description: video.synopsis }
        : undefined,
    }
  },
  head: ({ matches, loaderData }) => {
    const settings = settingsFromMatches(matches),
      video = loaderData?.metadata
    return {
      meta: [
        ...publicMeta(
          settings,
          publicTitle(settings, video ? 'Watch ' + video.title : 'Watch'),
          video?.description,
        ),
        { name: 'robots', content: 'noindex,nofollow' },
      ],
    }
  },
  component: Watch,
})
function Watch() {
  const { slug } = Route.useParams(),
    bootstrap = Route.useLoaderData()
  const online = usePublicOnline()
  const client = useQueryClient(),
    options = watchMetadataOptions(slug)
  const query = useQuery({
    ...options,
    enabled:
      online && (!bootstrap.status || !!client.getQueryData(options.queryKey)),
  })
  const status =
    query.error instanceof CatalogRequestError
      ? query.error.status
      : (bootstrap.status ?? 503)
  const video = query.data?.item,
    nav = useEpisodeNav(video)
  return (
    <WatchShell
      title={video ? watchHeadline(video, nav.seriesTitle) : 'Watch'}
      back={watchBackTarget(video)}
    >
      {!online && (
        <p role="status" className="px-4 pt-4 text-muted-foreground">
          You are offline. Reconnect to play this video.
        </p>
      )}
      {video ? (
        <WatchContent key={video.id} video={video} nav={nav} />
      ) : query.isFetching || (!query.isError && !bootstrap.status) ? (
        <WatchSkeleton />
      ) : (
        <div className="mx-auto max-w-3xl p-4">
          <ContentFailure
            status={status}
            busy={query.isFetching}
            onRetry={() => {
              void query.refetch()
            }}
          />
        </div>
      )}
    </WatchShell>
  )
}
// Width follows the height left under the 56 px top bar so the 9:16 stage
// never needs a scroll to reach its controls; desktop also leaves 24 px padding.
const stage =
  'mx-auto w-[min(100%,calc((100svh-3.5rem)*9/16))] lg:mx-0 lg:w-[calc((100svh-3.5rem-3rem)*9/16)] lg:overflow-hidden lg:rounded-2xl'
const layout =
  'grid gap-5 pb-10 lg:grid-cols-[auto_minmax(0,560px)] lg:items-start lg:justify-center lg:gap-12 lg:px-10 lg:pt-6'
function WatchSkeleton() {
  return (
    <div role="status" aria-label="Loading video" className={layout}>
      <Skeleton
        className={cn('aspect-[9/16] rounded-none lg:rounded-2xl', stage)}
      />
      <div className="flex flex-col gap-4 px-4 lg:px-0">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}
// The first mount is the page load; later mounts are client navigations
// (for example moving to the next episode) and move focus to the title.
let firstWatchMount = true
function StepButton({
  episode,
  direction,
}: {
  episode: PublicEpisode | undefined
  direction: 'Previous' | 'Next'
}) {
  const prev = direction === 'Previous'
  const text = prev ? (
    <>
      <RiArrowLeftSLine data-icon="inline-start" aria-hidden="true" />
      Previous
    </>
  ) : (
    <>
      Next
      <RiArrowRightSLine data-icon="inline-end" aria-hidden="true" />
    </>
  )
  if (!episode)
    return (
      <Button
        variant={prev ? 'outline' : 'default'}
        className="min-h-11"
        disabled
      >
        {text}
      </Button>
    )
  return (
    <Button
      variant={prev ? 'outline' : 'default'}
      className="min-h-11"
      aria-label={`${direction} episode · ${episodeLabel(episode)}`}
      nativeButton={false}
      role="link"
      render={
        <Link
          to="/watch/$slug"
          params={{ slug: episode.slug }}
          preload={false}
        />
      }
    >
      {text}
    </Button>
  )
}
function UpNext({ episode }: { episode: PublicEpisode }) {
  return (
    <div
      role="status"
      className="absolute inset-x-3 bottom-16 z-10 flex flex-col gap-2 rounded-2xl bg-black/85 p-3 text-white"
    >
      <span className="text-xs text-white/80">
        Up next · {episodeLabel(episode)}
      </span>
      <span className="font-semibold [overflow-wrap:anywhere]">
        {episode.title}
      </span>
      <Button
        className="min-h-11"
        nativeButton={false}
        role="link"
        render={
          <Link
            to="/watch/$slug"
            params={{ slug: episode.slug }}
            preload={false}
          />
        }
      >
        <RiPlayFill data-icon="inline-start" aria-hidden="true" />
        Play next
      </Button>
    </div>
  )
}
function WatchContent({ video, nav }: { video: WatchVideo; nav: EpisodeNav }) {
  const load = useCallback(
    (signal: AbortSignal) =>
      publicContentBrowser().playback(video.slug, video.id, signal),
    [video.slug, video.id],
  )
  const heading = useRef<HTMLHeadingElement>(null),
    [ended, setEnded] = useState(false)
  useEffect(() => {
    if (firstWatchMount) firstWatchMount = false
    else heading.current?.focus({ preventScroll: true })
  }, [])
  const episode = video.kind === 'episode'
  return (
    <div className={layout}>
      <div className={cn('relative', stage)}>
        <VerticalVideoPlayer
          key={video.id}
          loadPlayback={load}
          onEnded={() => setEnded(true)}
          onPlay={() => setEnded(false)}
        />
        {ended && nav.next && <UpNext episode={nav.next} />}
      </div>
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col items-start gap-4 px-4 lg:mx-0 lg:max-w-none lg:px-0">
        {episode && nav.seriesSlug && (
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-muted-foreground"
          >
            <Link
              to="/series/$slug"
              params={{ slug: nav.seriesSlug }}
              className="underline-offset-4 hover:underline"
            >
              {nav.seriesTitle ?? 'Series'}
            </Link>
            {` › Season ${video.seasonNumber} › Episode ${video.episodeNumber}`}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant="secondary">{watchKindLabel[video.kind]}</Badge>
          <span className="text-sm text-muted-foreground">
            {episode ? `S${video.seasonNumber} E${video.episodeNumber} · ` : ''}
            {Math.ceil(video.durationMs / 60000)} min
          </span>
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-heading text-2xl leading-tight font-bold [overflow-wrap:anywhere] outline-none lg:text-3xl"
        >
          {video.title}
        </h1>
        <ClampedText
          text={video.synopsis}
          clampClass="line-clamp-3 lg:line-clamp-none"
        />
        {!episode && (
          <Button
            variant="outline"
            className="min-h-11"
            nativeButton={false}
            role="link"
            render={
              <Link
                to="/videos/$slug"
                params={{ slug: video.slug }}
                preload={false}
              />
            }
          >
            Details
          </Button>
        )}
        {episode && nav.seriesSlug && (
          <>
            <div className="grid w-full grid-cols-2 gap-2">
              <StepButton episode={nav.previous} direction="Previous" />
              <StepButton episode={nav.next} direction="Next" />
            </div>
            {nav.atEnd && (
              <p role="status" className="text-sm text-muted-foreground">
                You’re all caught up.{' '}
                <Link
                  to="/series/$slug"
                  params={{ slug: nav.seriesSlug }}
                  className="underline underline-offset-4"
                >
                  Back to series
                </Link>
              </p>
            )}
            <EpisodePanel nav={nav} video={video} />
          </>
        )}
      </div>
    </div>
  )
}
