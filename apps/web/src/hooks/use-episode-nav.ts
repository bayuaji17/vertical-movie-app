import { useEffect } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  contentDetailOptions,
  contentEpisodesOptions,
} from '#/lib/catalog/content-queries'
import {
  episodeNeighbors,
  seasonNumbers,
  sortedEpisodes,
} from '#/lib/catalog/season-model'
import type { WatchVideo } from '#/lib/catalog/content-model'
import { usePublicOnline } from './use-public-online'

const maxPages = 20

/**
 * Series context for a watched episode: title, ordered episodes and the
 * previous/next neighbors. Pages load on demand until both neighbors are known.
 */
export function useEpisodeNav(video: WatchVideo | undefined) {
  const online = usePublicOnline(),
    seriesSlug = video?.kind === 'episode' ? video.seriesSlug : null
  const detail = useQuery({
    ...contentDetailOptions('series', seriesSlug ?? ''),
    enabled: !!seriesSlug && online,
  })
  const query = useInfiniteQuery({
    ...contentEpisodesOptions(seriesSlug ?? ''),
    enabled: !!seriesSlug && online,
  })
  const episodes = sortedEpisodes(query.data?.pages)
  const neighbors = episodeNeighbors(episodes, video?.id ?? '')
  const pages = query.data?.pages.length ?? 0
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } = query
  const more =
    !!seriesSlug &&
    neighbors.needsMore &&
    pages > 0 &&
    pages < maxPages &&
    hasNextPage &&
    !isFetching &&
    !isFetchNextPageError
  useEffect(() => {
    if (more) void fetchNextPage({ cancelRefetch: false })
  }, [more, pages, fetchNextPage])
  const item = detail.data?.item
  return {
    seriesSlug,
    seriesTitle: item?.kind === 'series' ? item.title : undefined,
    episodes,
    seasons: seasonNumbers(episodes),
    previous: neighbors.previous,
    next: neighbors.next,
    // The last episode is only final once every page is loaded.
    atEnd: neighbors.index >= 0 && !neighbors.next && !hasNextPage,
    loading: query.isPending && query.fetchStatus !== 'idle',
    failed: query.isError,
    retry: () => {
      void (isFetchNextPageError
        ? fetchNextPage({ cancelRefetch: false })
        : query.refetch())
    },
  }
}
export type EpisodeNav = ReturnType<typeof useEpisodeNav>
