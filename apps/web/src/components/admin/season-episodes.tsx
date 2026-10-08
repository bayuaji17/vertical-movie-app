import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Season } from '#/lib/admin/series-client'
import type { AdminSeries } from './series-resource'
import { useSeriesEditor } from '#/hooks/use-series-editor'
import { episodeListOptions } from '#/lib/admin/series-queries'
import { seasonsHref } from '#/lib/admin/series-form-state'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { AdminPageHeading } from './page-heading'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '#/components/ui/empty'
import { ContentStatus } from './content-status'

export function SeasonEpisodesView({
  series,
  season,
}: {
  series: AdminSeries
  season: Season
}) {
  const api = useSeriesEditor(series.data.id, season.id)
  const query = useInfiniteQuery(
    episodeListOptions(api.client, api.identity, {
      seriesId: series.data.id,
      seasonId: season.id,
      search: '',
      includeArchived: true,
    }),
  )
  const items = Array.from(
    new Map(
      query.data?.pages.flatMap((page) =>
        page.items.map((row) => [row.id, row] as const),
      ) ?? [],
    ).values(),
  )
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeading
        title={`Season ${season.seasonNumber} episodes`}
        description={series.data.title}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            className="min-h-11"
            render={<Link to={seasonsHref(series.data.id)} />}
          >
            Back to seasons
          </Button>
        }
      />
      {query.isPending && (
        <Skeleton className="h-64 w-full" aria-label="Loading episodes" />
      )}
      {query.isError && (
        <Alert variant="destructive">
          <AlertTitle>Episodes unavailable</AlertTitle>
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
        (!items.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No episodes yet</EmptyTitle>
              <EmptyDescription>
                This season has no saved episodes.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((episode) => (
              <Card key={episode.id}>
                <CardHeader>
                  <CardTitle className="break-words">
                    Episode {episode.episodeNumber} · {episode.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContentStatus item={episode} />
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="min-h-11 self-start"
          disabled={!api.online || query.isFetching}
          onClick={() => {
            if (!query.isFetching) void query.fetchNextPage()
          }}
        >
          {query.isFetchingNextPage ? 'Loading...' : 'Load more episodes'}
        </Button>
      )}
    </div>
  )
}
