import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '#/components/catalog/home-page'

export const Route = createFileRoute('/')({
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
