import { createFileRoute } from '@tanstack/react-router'
import { SeriesResource } from '#/components/admin/series-resource'
import { SeasonEditor } from '#/components/admin/season-editor'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/seasons/new',
)({
  head: () => ({
    meta: [
      { title: 'Add season · Vertical Movie' },
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
        <SeasonEditor
          key={seriesId}
          series={series}
          seasons={seasons}
          stale={stale}
        />
      )}
    </SeriesResource>
  )
}
