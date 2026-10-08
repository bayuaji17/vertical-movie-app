import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Episode, Season } from '#/lib/admin/series-client'
import { isUuid } from '#/lib/admin/content-identifiers'
import { episodeDetailOptions } from '#/lib/admin/series-queries'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { useSeriesEditor } from '#/hooks/use-series-editor'
import type { AdminSeries } from './series-resource'
import { SeriesResource } from './series-resource'
import { AdminPageHeading } from './page-heading'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'

export function EpisodeResource({
  seriesId,
  episodeId,
  children,
}: {
  seriesId: string
  episodeId: string
  children: (
    series: AdminSeries,
    episode: Episode,
    seasons: Season[],
    stale: boolean,
  ) => ReactNode
}) {
  if (!isUuid(episodeId))
    return (
      <AdminPageHeading
        title="Episode not found"
        description="Check the episode link and try again."
      />
    )
  return (
    <SeriesResource seriesId={seriesId}>
      {(series, seasons, stale) => (
        <EpisodeQuery
          series={series}
          seasons={seasons}
          id={episodeId}
          stale={stale}
        >
          {children}
        </EpisodeQuery>
      )}
    </SeriesResource>
  )
}
function EpisodeQuery({
  series,
  seasons,
  id,
  stale,
  children,
}: {
  series: AdminSeries
  seasons: Season[]
  id: string
  stale: boolean
  children: (
    series: AdminSeries,
    episode: Episode,
    seasons: Season[],
    stale: boolean,
  ) => ReactNode
}) {
  const api = useSeriesEditor(series.data.id, id),
    query = useQuery({
      ...episodeDetailOptions(api.client, api.identity, series.data.id, id),
      staleTime: 0,
    })
  return (
    <>
      {query.isPending && (
        <Skeleton className="h-64 w-full" aria-label="Loading episode" />
      )}
      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>Episode unavailable</AlertTitle>
          <AlertDescription>
            {contentErrorMessage(query.error)}
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!api.online || query.isFetching}
              onClick={() => void query.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {query.data &&
        children(
          series,
          query.data,
          seasons,
          stale || query.isError || query.isFetching || !api.online,
        )}
    </>
  )
}
