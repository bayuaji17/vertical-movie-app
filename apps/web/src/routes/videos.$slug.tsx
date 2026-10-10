import {
  publicTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import { videoOptions, loadVideo } from '#/lib/public/catalog-queries'
import type { PublicVideoDetail } from '#/lib/public/catalog-client'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { VideoDetail } from '#/components/public/video-detail'
import { catalogSearch, catalogType } from '#/lib/public/catalog-model'
import { normalizeCatalogLocation } from '#/lib/public/catalog-navigation'
import { setPublicHttpStatus } from '#/lib/public/catalog-reader'
import { isMissingContent } from '#/lib/public/missing-content'

export const Route = createFileRoute('/videos/$slug')({
  validateSearch: catalogSearch,
  beforeLoad: ({ location }) => normalizeCatalogLocation(location),
  loader: async ({ context, params }) => {
    const result = await loadVideo(context.queryClient, params.slug)
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
      type={catalogType(Route.useSearch().type)}
      status={Route.useLoaderData().status}
    />
  ),
})
