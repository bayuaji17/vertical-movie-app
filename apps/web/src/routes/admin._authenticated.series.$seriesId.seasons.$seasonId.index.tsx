import { createFileRoute } from '@tanstack/react-router'
import { SeasonResource } from '#/components/admin/series-resource'
import { SeasonEpisodesView } from '#/components/admin/season-episodes'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/seasons/$seasonId/',
)({
  head: () => ({
    meta: [
      { title: 'Episodes · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Page,
})
function Page() {
  const { seriesId, seasonId } = Route.useParams()
  return (
    <SeasonResource seriesId={seriesId} seasonId={seasonId}>
      {(series, season) => (
        <SeasonEpisodesView key={season.id} series={series} season={season} />
      )}
    </SeasonResource>
  )
}
