import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { VerticalVideoPlayer } from '#/components/vertical-video-player'
import { createApiClient, getBrowserApiBaseUrl } from '#/lib/api/client'

export const Route = createFileRoute(
  '/admin/_authenticated/videos/$id/preview',
)({ component: Preview })
function Preview() {
  const { id } = Route.useParams()
  const load = useCallback(async () => {
    const base = getBrowserApiBaseUrl()
    if (!base) throw new Error('API unavailable')
    const result = await createApiClient(base)
      .admin.videos({ id })
      .playback.get()
    if (result.error) throw new Error('Preview unavailable')
    return result.data
  }, [id])
  return (
    <section className="mx-auto w-full max-w-sm p-4">
      <h1 className="mb-4 text-lg font-semibold">Preview video</h1>
      <VerticalVideoPlayer loadPlayback={load} />
    </section>
  )
}
