import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { VerticalVideoPlayer } from '#/components/vertical-video-player'
import { createApiClient, getBrowserApiBaseUrl } from '#/lib/api/client'

export const Route = createFileRoute('/watch/$slug')({ component: Watch })
function Watch() {
  const { slug } = Route.useParams()
  const load = useCallback(async () => {
    const base = getBrowserApiBaseUrl()
    if (!base) throw new Error('API unavailable')
    const result = await createApiClient(base).videos({ slug }).playback.get()
    if (result.error) throw new Error('Video unavailable')
    return result.data
  }, [slug])
  return (
    <main className="mx-auto w-full max-w-sm p-4">
      <VerticalVideoPlayer loadPlayback={load} />
    </main>
  )
}
