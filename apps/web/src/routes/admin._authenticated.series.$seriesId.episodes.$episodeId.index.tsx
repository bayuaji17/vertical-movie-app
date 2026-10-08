import { createFileRoute } from '@tanstack/react-router'
import { EpisodeResource } from '#/components/admin/episode-resource'
import { EpisodeDetailView } from '#/components/admin/episode-detail'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/episodes/$episodeId/',
)({
  head: () => ({
    meta: [
      { title: 'Episode · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Page,
})
function Page() {
  const { seriesId, episodeId } = Route.useParams()
  return (
    <EpisodeResource seriesId={seriesId} episodeId={episodeId}>
      {(series, episode, seasons, stale) => (
        <EpisodeDetailView
          key={episodeId}
          series={series}
          episode={episode}
          seasons={seasons}
          stale={stale}
        />
      )}
    </EpisodeResource>
  )
}
