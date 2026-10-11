import {
  publicTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import { videoOptions, loadVideoDetail } from '#/lib/public/catalog-queries'
import type { PublicVideoDetail } from '#/lib/public/catalog-client'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { VideoDetail } from '#/components/public/video-detail'
import { stripLegacyTypeSearch } from '#/lib/public/catalog-navigation'
import { setPublicHttpStatus } from '#/lib/public/catalog-reader'
import { isMissingContent } from '#/lib/public/missing-content'

export const Route = createFileRoute('/videos/$slug')({
  beforeLoad: ({ location }) => stripLegacyTypeSearch(location),
  loader: async ({ context, params }) => {
    const result = await loadVideoDetail(context.queryClient, params.slug)
    setPublicHttpStatus(result.status)
    if (isMissingContent(result.status)) throw notFound()
    const video = context.queryClient.getQueryData<PublicVideoDetail>(
      videoOptions(params.slug).queryKey,
    )?.item
    return {
      ...result,
      metadata: video
        ? { title: video.title, description: video.synopsis }
        : undefined,
    }
  },
  head: ({ matches, loaderData }) => {
    const settings = settingsFromMatches(matches),
      video = loaderData?.metadata
    return {
      meta: [
        ...publicMeta(
          settings,
          publicTitle(settings, video?.title ?? 'Video'),
          video?.description,
        ),
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    }
  },
  component: () => (
    <VideoDetail
      key={Route.useParams().slug}
      slug={Route.useParams().slug}
      status={Route.useLoaderData().status}
    />
  ),
})
