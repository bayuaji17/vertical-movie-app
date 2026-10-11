import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { contentSlug } from '#/lib/catalog/content-model'

// Film and Standalone details live at /videos/:slug; keep old links working.
export const Route = createFileRoute('/titles/$kind/$slug')({
  beforeLoad: ({ params }) => {
    if (
      (params.kind !== 'movie' && params.kind !== 'standalone') ||
      !contentSlug.safeParse(params.slug).success
    )
      throw notFound()
    throw redirect({
      to: '/videos/$slug',
      params: { slug: params.slug },
      replace: true,
    })
  },
})
