import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { ContentDetail } from '#/lib/admin/content-client'
import { contentLabels } from '#/lib/admin/content-client'
import { isEditableContent } from '#/lib/admin/content-form-state'
import { AdminPageHeading } from './page-heading'
import { BackToContent, contentHref } from './content-resource'
import { ContentStatus } from './content-status'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { OwnerMediaPanel } from './media-panel'
import { VideoPublicationMedia } from './publication-panel'
import { seasonsHref } from '#/lib/admin/series-form-state'

function MetadataRows({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>
}) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0 space-y-1">
          <dt className="text-sm text-muted-foreground">{row.label}</dt>
          <dd className="whitespace-pre-wrap break-words text-sm font-medium">
            {row.value ?? 'Not set'}
          </dd>
        </div>
      ))}
    </dl>
  )
}
export function ContentDetailView({
  detail,
  metadataStale = false,
}: {
  detail: ContentDetail
  metadataStale?: boolean
}) {
  const d = detail.data
  const editable = isEditableContent(detail)
  const names =
    detail.type === 'series'
      ? new Map<string, string>()
      : new Map(
          detail.data.effectiveGenres.map((genre) => [genre.id, genre.name]),
        )
  return (
    <div className="space-y-6">
      <AdminPageHeading
        title="Content details"
        description="Review content metadata and its current state."
        actions={
          <>
            <BackToContent />
            {editable && (
              <Button
                nativeButton={false}
                className="min-h-11"
                render={<Link to={contentHref(detail.type, d.id) + '/edit'} />}
              >
                Edit draft
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="break-words text-2xl">{d.title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {detail.type !== 'series' && detail.data.kind === 'episode'
                ? 'Episode'
                : contentLabels[detail.type]}
            </Badge>
            <ContentStatus item={d} />
          </div>
        </CardHeader>
        <CardContent>
          <MetadataRows
            rows={[
              { label: 'Slug', value: d.slug },
              { label: 'Original title', value: d.originalTitle },
              { label: 'Original language', value: d.originalLanguage },
              { label: 'Release year', value: d.releaseYear },
              { label: 'Release date', value: d.releaseDate },
              {
                label: 'Genres',
                value: d.genreIds.length
                  ? d.genreIds.map((id) => names.get(id) ?? id).join(', ')
                  : 'No genres selected',
              },
              { label: 'Synopsis', value: d.synopsis },
              { label: 'Description', value: d.description },
            ]}
          />
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {detail.type === 'series'
                ? 'Series information'
                : 'Video information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {detail.type === 'series' ? (
              <>
                <MetadataRows
                  rows={[
                    {
                      label: 'Completion',
                      value:
                        detail.data.completionStatus === 'ongoing'
                          ? 'Ongoing'
                          : 'Completed',
                    },
                  ]}
                />
                <div className="space-y-2">
                  <h3 className="font-medium">Seasons</h3>
                  {detail.data.seasons.map((season) => (
                    <p key={season.id} className="text-sm">
                      Season {season.seasonNumber}
                      {season.title ? ` · ${season.title}` : ''}
                    </p>
                  ))}
                  {detail.data.seasons.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No seasons available.
                    </p>
                  )}
                  <Button
                    nativeButton={false}
                    variant="outline"
                    className="min-h-11"
                    render={<Link to={seasonsHref(d.id)} />}
                  >
                    Manage seasons & episodes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <MetadataRows
                  rows={[
                    {
                      label: 'Rights confirmation',
                      value: detail.data.rightsConfirmedAt
                        ? 'Confirmed'
                        : 'Not confirmed',
                    },
                    {
                      label: 'Source file',
                      value: detail.data.sourceAvailability.replaceAll(
                        '_',
                        ' ',
                      ),
                    },
                  ]}
                />
                <p className="text-sm text-muted-foreground">
                  Source availability describes the original upload. HLS
                  playback readiness is managed separately.
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Record information</CardTitle>
          </CardHeader>
          <CardContent>
            <MetadataRows
              rows={[
                {
                  label: 'Created (UTC)',
                  value: <time dateTime={d.createdAt}>{d.createdAt}</time>,
                },
                {
                  label: 'Updated (UTC)',
                  value: <time dateTime={d.updatedAt}>{d.updatedAt}</time>,
                },
                { label: 'First published (UTC)', value: d.firstPublishedAt },
                { label: 'Published (UTC)', value: d.publishedAt },
                { label: 'Archived (UTC)', value: d.archivedAt },
                { label: 'Record version', value: d.rowVersion },
              ]}
            />
            {!editable && (
              <p className="mt-5 text-sm text-muted-foreground">
                This content is read only in the metadata workflow.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {detail.type === 'series' ? (
        <OwnerMediaPanel
          owner={{ ownerType: 'series', ownerId: d.id }}
          type={detail.type}
        />
      ) : detail.data.kind !== 'episode' ? (
        <VideoPublicationMedia
          key={detail.type + ':' + d.id}
          detail={detail}
          type={detail.type}
          metadataStale={metadataStale}
        />
      ) : null}
    </div>
  )
}
