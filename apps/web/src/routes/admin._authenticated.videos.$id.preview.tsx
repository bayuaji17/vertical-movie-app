import { useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { VerticalVideoPlayer } from '#/components/vertical-video-player'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '#/lib/api/client'
import { Button } from '#/components/ui/button'
import {
  previewContext,
  previewDetailHref,
} from '#/lib/admin/preview-navigation'
import { BackToContent } from '#/components/admin/content-resource'

export const Route = createFileRoute(
  '/admin/_authenticated/videos/$id/preview',
)({
  validateSearch: previewContext,
  component: Preview,
})
function Preview() {
  const { id } = Route.useParams(),
    { type } = Route.useSearch(),
    cache = useQueryClient()
  const load = useCallback(async () => {
    const base = getBrowserApiBaseUrl()
    if (!base) throw new Error('API unavailable')
    const result = await createPrivateApiClient(base, cache)
      .admin.videos({ id })
      .playback.get()
    if (result.error) throw new Error('Preview unavailable')
    return result.data
  }, [id, cache])
  const back = previewDetailHref(id, type)
  return (
    <section className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Preview video</h1>
      {back ? (
        <Button
          nativeButton={false}
          variant="outline"
          className="min-h-11"
          render={<Link to={back} />}
        >
          Back to content details
        </Button>
      ) : (
        <BackToContent />
      )}
      <VerticalVideoPlayer loadPlayback={load} />
    </section>
  )
}
