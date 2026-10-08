import { createFileRoute } from '@tanstack/react-router'
import { SeasonResource } from '#/components/admin/series-resource'
import { SeasonEditor } from '#/components/admin/season-editor'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/seasons/$seasonId/edit',
)({
  head: () => ({
    meta: [
      { title: 'Edit season · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Page,
})
function Page() {
  const { seriesId, seasonId } = Route.useParams()
  return (
    <SeasonResource seriesId={seriesId} seasonId={seasonId}>
      {(series, season, seasons, stale) => (
        <SeasonEditor
          key={season.id}
          series={series}
          season={season}
          seasons={seasons}
          stale={stale}
        />
      )}
    </SeasonResource>
  )
}
