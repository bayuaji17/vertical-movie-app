import { createFileRoute } from '@tanstack/react-router'
import { SeriesResource } from '#/components/admin/series-resource'
import { SeriesSeasonsView } from '#/components/admin/series-seasons'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/seasons/',
)({
  head: () => ({
    meta: [
      { title: 'Seasons & episodes · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Page,
})
function Page() {
  const { seriesId } = Route.useParams()
  return (
    <SeriesResource seriesId={seriesId}>
      {(series, seasons, stale) => (
        <SeriesSeasonsView series={series} seasons={seasons} stale={stale} />
      )}
    </SeriesResource>
  )
}
