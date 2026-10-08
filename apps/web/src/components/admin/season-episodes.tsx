import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Season } from '#/lib/admin/series-client'
import type { AdminSeries } from './series-resource'
import { useSeriesEditor } from '#/hooks/use-series-editor'
import { episodeListOptions } from '#/lib/admin/series-queries'
import type { EpisodeListSearch } from '#/lib/admin/series-form-state'
import { Input } from '#/components/ui/input'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldLabel } from '#/components/ui/field'
import {
  seasonsHref,
  seasonHref,
  episodeHref,
} from '#/lib/admin/series-form-state'
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
  stale = false,
  filters,
  onFiltersChange,
}: {
  series: AdminSeries
  season: Season
  stale?: boolean
  filters: EpisodeListSearch
  onFiltersChange: (value: EpisodeListSearch) => void
}) {
  const api = useSeriesEditor(series.data.id, season.id)
  const [search, setSearch] = useState(filters.q)
  useEffect(() => setSearch(filters.q), [filters.q])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== filters.q)
        onFiltersChange({ ...filters, q: search.trim().slice(0, 200) })
    }, 300)
    return () => clearTimeout(timer)
  }, [search, filters, onFiltersChange])
  const active = !series.data.archivedAt && !season.archivedAt
  const query = useInfiniteQuery(
    episodeListOptions(api.client, api.identity, {
      seriesId: series.data.id,
      seasonId: season.id,
      search: filters.q,
      includeArchived: filters.archived,
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
          <>
            <Button
              nativeButton={false}
              variant="outline"
              className="min-h-11"
              render={<Link to={seasonsHref(series.data.id)} />}
            >
              Back to seasons
            </Button>
            {active && (
              <Button
                nativeButton={false}
                className="min-h-11"
                disabled={stale || !api.online}
                render={
                  <Link
                    to={seasonHref(series.data.id, season.id) + '/episodes/new'}
                  />
                }
              >
                Add episode
              </Button>
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-end gap-4">
        <Field className="max-w-sm">
          <FieldLabel htmlFor="episode-search">Search episodes</FieldLabel>
          <Input
            id="episode-search"
            className="h-11"
            value={search}
            maxLength={200}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id="archived-episodes"
            checked={filters.archived}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, archived: checked })
            }
          />
          <FieldLabel
            htmlFor="archived-episodes"
            className="min-h-11 cursor-pointer items-center"
          >
            Include archived episodes
          </FieldLabel>
        </div>
      </div>
      {!active && (
        <p role="status">
          This series or season is archived. Its episodes are read only.
        </p>
      )}
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
                No episodes match the current filters.
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
                <CardContent className="flex flex-col gap-4">
                  <ContentStatus item={episode} />
                  <Button
                    nativeButton={false}
                    variant="outline"
                    className="min-h-11 self-start"
                    render={
                      <Link to={episodeHref(series.data.id, episode.id)} />
                    }
                  >
                    View episode
                  </Button>
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
