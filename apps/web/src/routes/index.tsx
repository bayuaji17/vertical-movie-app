import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '#/components/catalog/home-page'
import { loadPublicCatalog } from '#/lib/catalog/public-catalog-queries'

export const Route = createFileRoute('/')({
  loader: ({ context }) => loadPublicCatalog(context.queryClient),
  head: () => ({
    meta: [
      { title: 'Vertical Movie — Find your next story' },
      {
        name: 'description',
        content:
          'Discover films, series, and short stories in portrait. Open to everyone.',
      },
    ],
  }),
  component: HomePage,
})
