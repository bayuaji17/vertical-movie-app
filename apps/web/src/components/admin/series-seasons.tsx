import { Link } from '@tanstack/react-router'
import type { Season } from '#/lib/admin/series-client'
import type { AdminSeries } from './series-resource'
import { seasonsHref, seriesHref } from '#/lib/admin/series-form-state'
import { AdminPageHeading } from './page-heading'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '#/components/ui/empty'

export function SeriesSeasonsView({
  series,
  seasons,
  stale,
}: {
  series: AdminSeries
  seasons: Season[]
  stale: boolean
}) {
  const active = !series.data.archivedAt
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeading
        title="Seasons & episodes"
        description={series.data.title}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              className="min-h-11"
              render={<Link to={seriesHref(series.data.id)} />}
            >
              Back to series
            </Button>
            {active && (
              <Button
                nativeButton={false}
                className="min-h-11"
                disabled={stale}
                render={<Link to={seasonsHref(series.data.id) + '/new'} />}
              >
                Add season
              </Button>
            )}
          </>
        }
      />
      {stale && (
        <p role="status" className="text-sm text-muted-foreground">
          Previously loaded seasons are shown. Refresh the page to confirm the
          latest state before editing.
        </p>
      )}
      {!active && (
        <p role="status">
          This series is archived. Its seasons and episodes are read only.
        </p>
      )}
      {seasons.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {seasons.map((season) => (
            <Card key={season.id}>
              <CardHeader>
                <CardTitle className="break-words">
                  Season {season.seasonNumber}
                  {season.title ? ` · ${season.title}` : ''}
                </CardTitle>
                <Badge variant="outline">
                  {season.archivedAt ? 'Archived' : 'Active'}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {season.description || 'No description.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    className="min-h-11"
                    render={
                      <Link
                        to={seasonsHref(series.data.id) + '/' + season.id}
                      />
                    }
                  >
                    View episodes
                  </Button>
                  {active && !season.archivedAt && (
                    <Button
                      variant="outline"
                      nativeButton={false}
                      className="min-h-11"
                      disabled={stale}
                      render={
                        <Link
                          to={
                            seasonsHref(series.data.id) +
                            '/' +
                            season.id +
                            '/edit'
                          }
                        />
                      }
                    >
                      Edit season
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No seasons yet</EmptyTitle>
            <EmptyDescription>
              Add a season to organize episodes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
