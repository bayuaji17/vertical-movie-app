import { Link } from '@tanstack/react-router'
import type { Episode, Season } from '#/lib/admin/series-client'
import type { AdminSeries } from './series-resource'
import { episodeHref, seasonHref } from '#/lib/admin/series-form-state'
import { AdminPageHeading } from './page-heading'
import { ContentStatus } from './content-status'
import { EpisodeMedia } from './episode-media'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'

export function EpisodeDetailView({
  series,
  episode,
  seasons,
  stale,
}: {
  series: AdminSeries
  episode: Episode
  seasons: Season[]
  stale: boolean
}) {
  const season = seasons.find((row) => row.id === episode.seasonId),
    editable =
      episode.publicationStatus === 'draft' &&
      !episode.archivedAt &&
      !series.data.archivedAt &&
      season &&
      !season.archivedAt
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeading
        title={episode.title}
        description={`${series.data.title} · Season ${episode.season.seasonNumber} · Episode ${episode.episodeNumber}`}
        actions={
          <>
            <Button
              nativeButton={false}
              variant="outline"
              className="min-h-11"
              render={
                <Link to={seasonHref(series.data.id, episode.seasonId)} />
              }
            >
              Back to episodes
            </Button>
            {editable && (
              <Button
                nativeButton={false}
                className="min-h-11"
                disabled={stale}
                render={
                  <Link
                    to={episodeHref(series.data.id, episode.id) + '/edit'}
                  />
                }
              >
                Edit episode
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Episode metadata</CardTitle>
          <ContentStatus item={episode} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="whitespace-pre-wrap break-words">
            {episode.synopsis || 'No synopsis yet.'}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {episode.description || 'No description yet.'}
          </p>
          <p className="break-words text-sm">Slug: {episode.slug}</p>
          <p className="text-sm">Version {episode.rowVersion}</p>
          <p className="text-sm">
            {episode.genreIds.length
              ? 'Episode genres'
              : 'Inherited series genres'}
            : {episode.effectiveGenres.map((g) => g.name).join(', ') || 'None'}
          </p>
          {!editable && (
            <p role="status" className="text-sm">
              This episode is read only because it or its parent is archived, or
              the episode is published.
            </p>
          )}
          {episode.publicationStatus === 'published' &&
            series.data.publicationStatus === 'draft' && (
              <p role="status">
                This episode remains private until the series is published.
              </p>
            )}
        </CardContent>
      </Card>
      <EpisodeMedia seriesId={series.data.id} episodeId={episode.id} />
    </div>
  )
}
