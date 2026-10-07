import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '#/components/catalog/content-page'
import { loadContent } from '#/lib/catalog/content-queries'

export const Route = createFileRoute('/series/$slug')({
  loader: ({ context, params }) =>
    loadContent(context.queryClient, 'series', params.slug),
  head: () => ({ meta: [{ title: 'Series details — Vertical Movie' }] }),
  component: () => {
    const { slug } = Route.useParams()
    return (
      <ContentPage
        key={slug}
        kind="series"
        slug={slug}
        bootstrap={Route.useLoaderData()}
      />
    )
  },
})
