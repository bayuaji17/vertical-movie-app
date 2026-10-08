import { createFileRoute } from '@tanstack/react-router'
import { SeasonResource } from '#/components/admin/series-resource'
import { EpisodeEditor } from '#/components/admin/episode-editor'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/seasons/$seasonId/episodes/new',
)({
  head: () => ({
    meta: [
      { title: 'Add episode · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Page,
})
function Page() {
  const { seriesId, seasonId } = Route.useParams()
  return (
    <SeasonResource seriesId={seriesId} seasonId={seasonId}>
      {(series, _season, seasons, stale) => (
        <EpisodeEditor
          key={seasonId}
          series={series}
          seasons={seasons}
          seasonId={seasonId}
          stale={stale}
        />
      )}
    </SeasonResource>
  )
}
