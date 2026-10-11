import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { RiPlayFill } from '@remixicon/react'
import { PublicShell } from './public-shell'
import { PublicFailure } from './catalog-states'
import { EpisodeRow } from './episode-row'
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
import { Poster } from '#/components/catalog/poster'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { usePublicOnline } from '#/hooks/use-public-online'
import { CatalogRequestError } from '#/lib/catalog/catalog-client'
import {
  contentDetailOptions,
  contentEpisodesOptions,
} from '#/lib/catalog/content-queries'
import type { ContentBootstrap } from '#/lib/catalog/content-queries'
import {
  activeSeason,
  episodeLabel,
  seasonNumbers,
  seriesSummary,
  sortedEpisodes,
} from '#/lib/catalog/season-model'

const tabLimit = 4

function SeasonPicker({
  seasons,
  value,
  onChange,
}: {
  seasons: number[]
  value: number
  onChange: (season: number) => void
}) {
  if (seasons.length < 2) return null
  if (seasons.length > tabLimit)
    return (
      <NativeSelect
        aria-label="Season"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-fit [&_select]:h-11"
      >
        {seasons.map((n) => (
          <NativeSelectOption key={n} value={String(n)}>
            Season {n}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    )
  return (
    <ToggleGroup
      aria-label="Season"
      value={[String(value)]}
      onValueChange={(values) => {
        if (values[0]) onChange(Number(values[0]))
      }}
      className="w-fit flex-wrap"
    >
      {seasons.map((n) => (
        <ToggleGroupItem key={n} value={String(n)} className="min-h-11">
          Season {n}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
export function SeriesDetail({
  slug,
  bootstrap,
}: {
  slug: string
  bootstrap: ContentBootstrap
}) {
  const client = useQueryClient(),
    online = usePublicOnline(),
    detailOptions = contentDetailOptions('series', slug),
    episodeOptions = contentEpisodesOptions(slug)
  const detail = useQuery({
    ...detailOptions,
    enabled:
      !bootstrap.detailStatus || !!client.getQueryData(detailOptions.queryKey),
  })
  const episodesQuery = useInfiniteQuery({
    ...episodeOptions,
    enabled:
      !bootstrap.episodesStatus ||
      !!client.getQueryData(episodeOptions.queryKey),
  })
  const [chosen, setChosen] = useState<number>()
  const item = detail.data?.item
  const status =
    detail.error instanceof CatalogRequestError
      ? detail.error.status
      : (bootstrap.detailStatus ?? 503)
  const episodes = sortedEpisodes(episodesQuery.data?.pages)
  const seasons = seasonNumbers(episodes)
  const season = activeSeason(seasons, chosen)
  const visible = episodes.filter((e) => e.seasonNumber === season)
  const first = episodes.at(0)
  const total =
    episodesQuery.data?.pages.at(-1)?.total ??
    (item?.kind === 'series' ? item.episodeCount : 0)
  const invalid =
    episodesQuery.isFetchNextPageError &&
    episodesQuery.error instanceof CatalogRequestError &&
    episodesQuery.error.status === 422
  const busy =
    episodesQuery.isFetching || episodesQuery.fetchStatus === 'paused'
  async function restart() {
    await client.cancelQueries({
      queryKey: episodeOptions.queryKey,
      exact: true,
    })
    await client.resetQueries({
      queryKey: episodeOptions.queryKey,
      exact: true,
    })
    if (bootstrap.episodesStatus) await episodesQuery.refetch()
  }
  return (
    <PublicShell>
      <section className="flex flex-col gap-6">
        <BackToBrowse />
        {!online && (
          <Alert role="status">
            <AlertTitle>You are offline.</AlertTitle>
            <AlertDescription>
              Reconnect to watch these episodes.
            </AlertDescription>
          </Alert>
        )}
        {!item ? (
          detail.fetchStatus === 'fetching' ||
          (!detail.isError && !bootstrap.detailStatus) ? (
            <DetailSkeleton label="Loading series" />
          ) : (
            <PublicFailure
              title={
                status === 404 || status === 422
                  ? 'Series unavailable'
                  : 'Could not load series'
              }
              description={
                status === 404 || status === 422
                  ? 'This series is no longer available in the public catalog.'
                  : 'Please try again in a moment.'
              }
              action="Retry series"
              busy={detail.isFetching}
              onRetry={() => void detail.refetch()}
            />
          )
        ) : (
          <>
            <article className={detailLayout}>
              <div className={detailHeader}>
                <div className={detailPosterSlot}>
                  <Poster item={item} eager />
                </div>
                <div className={detailTitleSlot}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Badge variant="secondary">Series</Badge>
                    <span className="text-sm text-muted-foreground">
                      {seriesSummary(
                        total,
                        seasons.length,
                        !!episodesQuery.data && !episodesQuery.hasNextPage,
                      )}
                    </span>
                  </div>
                  <DetailTitle>{item.title}</DetailTitle>
                  {item.genres.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {item.genres.map((genre) => genre.name).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              <DetailSynopsis text={item.synopsis} />
              {first && (
                <DetailCta>
                  <Button
                    className="min-h-11 w-full sm:w-auto"
                    disabled={!online}
                    nativeButton={false}
                    role="link"
                    render={
                      <Link
                        to="/watch/$slug"
                        params={{ slug: first.slug }}
                        preload={false}
                      />
                    }
                  >
                    <RiPlayFill data-icon="inline-start" aria-hidden="true" />
                    Play {episodeLabel(first)}
                  </Button>
                </DetailCta>
              )}
            </article>
            <section aria-label="Episodes" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-2xl font-bold">Episodes</h2>
                {season !== undefined && (
                  <SeasonPicker
                    seasons={seasons}
                    value={season}
                    onChange={setChosen}
                  />
                )}
              </div>
              {visible.length > 0 && (
                <ul
                  aria-label={`Season ${season} episodes`}
                  className="flex flex-col gap-2"
                >
                  {visible.map((episode) => (
                    <EpisodeRow key={episode.id} episode={episode} />
                  ))}
                </ul>
              )}
              {episodesQuery.isFetching && (
                <div
                  role="status"
                  aria-label={
                    episodesQuery.data
                      ? 'Loading more episodes'
                      : 'Loading episodes'
                  }
                  className="flex flex-col gap-2"
                >
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              )}
              {episodesQuery.fetchStatus === 'paused' && (
                <p role="status">
                  Connection paused. Episodes will resume when you are online.
                </p>
              )}
              {episodesQuery.data && episodes.length === 0 && (
                <p role="status">No episodes are currently available.</p>
              )}
              {(episodesQuery.isError ||
                (!episodesQuery.data &&
                  bootstrap.episodesStatus &&
                  !episodesQuery.isFetching)) && (
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
                      else if (episodesQuery.isFetchNextPageError)
                        void episodesQuery.fetchNextPage({
                          cancelRefetch: false,
                        })
                      else void episodesQuery.refetch()
                    }}
                  >
                    {invalid ? 'Refresh episodes' : 'Retry episodes'}
                  </Button>
                </div>
              )}
              {episodesQuery.hasNextPage &&
                !episodesQuery.isFetchNextPageError && (
                  <Button
                    className="min-h-11 self-center"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      void episodesQuery.fetchNextPage({ cancelRefetch: false })
                    }}
                  >
                    {episodesQuery.isFetchingNextPage
                      ? 'Loading episodes…'
                      : 'Load more episodes'}
                  </Button>
                )}
            </section>
          </>
        )}
      </section>
    </PublicShell>
  )
}
