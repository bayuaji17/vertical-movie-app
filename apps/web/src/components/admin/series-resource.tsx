import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ContentDetail } from '#/lib/admin/content-client'
import type { Season } from '#/lib/admin/series-client'
import { isUuid } from '#/lib/admin/content-identifiers'
import { seasonListOptions } from '#/lib/admin/series-queries'
import { useSeriesEditor } from '#/hooks/use-series-editor'
import { ContentResource } from './content-resource'
import { AdminPageHeading } from './page-heading'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'

export type AdminSeries = Extract<ContentDetail, { type: 'series' }>
export function SeriesResource({
  seriesId,
  children,
}: {
  seriesId: string
  children: (
    series: AdminSeries,
    seasons: Season[],
    stale: boolean,
  ) => ReactNode
}) {
  return (
    <ContentResource type="series" id={seriesId}>
      {(detail, stale) =>
        detail.type === 'series' ? (
          <SeasonsResource series={detail} parentStale={stale}>
            {children}
          </SeasonsResource>
        ) : null
      }
    </ContentResource>
  )
}
function SeasonsResource({
  series,
  parentStale,
  children,
}: {
  series: AdminSeries
  parentStale: boolean
  children: (
    series: AdminSeries,
    seasons: Season[],
    stale: boolean,
  ) => ReactNode
}) {
  const api = useSeriesEditor(series.data.id, 'seasons-read')
  const query = useQuery({
    ...seasonListOptions(api.client, api.identity, series.data.id, true),
    staleTime: 0,
  })
  return (
    <>
      {query.isPending && (
        <Skeleton className="h-64 w-full" aria-label="Loading seasons" />
      )}
      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>Seasons unavailable</AlertTitle>
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
          query.data.items,
          parentStale || query.isFetching || query.isError || !api.online,
        )}
    </>
  )
}
export function SeasonResource({
  seriesId,
  seasonId,
  children,
}: {
  seriesId: string
  seasonId: string
  children: (
    series: AdminSeries,
    season: Season,
    seasons: Season[],
    stale: boolean,
  ) => ReactNode
}) {
  if (!isUuid(seasonId))
    return (
      <AdminPageHeading
        title="Season not found"
        description="Check the season link and try again."
      />
    )
  return (
    <SeriesResource seriesId={seriesId}>
      {(series, seasons, stale) => {
        const season = seasons.find((row) => row.id === seasonId)
        return season ? (
          children(series, season, seasons, stale)
        ) : (
          <AdminPageHeading
            title="Season not found"
            description="Check the season link and try again."
          />
        )
      }}
    </SeriesResource>
  )
}
