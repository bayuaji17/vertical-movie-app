import {
  publicTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ContentFailure } from '#/components/catalog/content-page'
import { WatchShell } from '#/components/public/watch-shell'
import { WatchContent, WatchSkeleton } from '#/components/public/watch-content'
import { useEpisodeNav } from '#/hooks/use-episode-nav'
import { stripLegacyTypeSearch } from '#/lib/public/catalog-navigation'
import { isMissingContent } from '#/lib/public/missing-content'
import { usePublicOnline } from '#/hooks/use-public-online'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import {
  loadWatchMetadata,
  watchMetadataOptions,
  loadEpisodeContext,
} from '#/lib/catalog/content-queries'
import type { WatchVideo } from '#/lib/catalog/content-model'
import { watchBackTarget, watchHeadline } from '#/lib/catalog/watch-model'

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
