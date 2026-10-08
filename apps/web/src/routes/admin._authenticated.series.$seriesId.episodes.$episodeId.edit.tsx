import { createFileRoute } from '@tanstack/react-router'
import { EpisodeResource } from '#/components/admin/episode-resource'
import { EpisodeEditor } from '#/components/admin/episode-editor'

export const Route = createFileRoute(
  '/admin/_authenticated/series/$seriesId/episodes/$episodeId/edit',
)({
  head: () => ({
    meta: [
      { title: 'Edit episode · Vertical Movie' },
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
        <EpisodeEditor
          key={episodeId}
          series={series}
          episode={episode}
          seasons={seasons}
          seasonId={episode.seasonId}
          stale={stale}
        />
      )}
    </EpisodeResource>
  )
}
