import { createFileRoute } from '@tanstack/react-router'
import { VideoDetail } from '#/components/public/video-detail'
import { catalogSearch, catalogType } from '#/lib/public/catalog-model'
import { normalizeCatalogLocation } from '#/lib/public/catalog-navigation'
import { loadVideo } from '#/lib/public/catalog-queries'
import { setPublicHttpStatus } from '#/lib/public/catalog-reader'

export const Route = createFileRoute('/videos/$slug')({
  validateSearch: catalogSearch,
  beforeLoad: ({ location }) => normalizeCatalogLocation(location),
  loader: async ({ context, params }) => {
    const result = await loadVideo(context.queryClient, params.slug)
    setPublicHttpStatus(result.status)
    return result
  },
  head: () => ({
    meta: [
      { title: 'Video — Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: () => (
    <VideoDetail
      key={Route.useParams().slug}
      slug={Route.useParams().slug}
      type={catalogType(Route.useSearch().type)}
      status={Route.useLoaderData().status}
    />
  ),
})
