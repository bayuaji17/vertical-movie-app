import { createFileRoute } from '@tanstack/react-router'
import { SeasonResource } from '#/components/admin/series-resource'
import { SeasonEpisodesView } from '#/components/admin/season-episodes'
import { episodeListSearch } from '#/lib/admin/series-form-state'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/seasons/$seasonId/',
)({
  validateSearch: episodeListSearch,
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
  const filters = Route.useSearch(),
    navigate = Route.useNavigate()
  return (
    <SeasonResource seriesId={seriesId} seasonId={seasonId}>
      {(series, season, _seasons, stale) => (
        <SeasonEpisodesView
          key={season.id}
          series={series}
          season={season}
          stale={stale}
          filters={filters}
          onFiltersChange={(value) =>
            void navigate({ search: value, replace: true })
          }
        />
      )}
    </SeasonResource>
  )
}
