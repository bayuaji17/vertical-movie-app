import { createFileRoute } from '@tanstack/react-router'
import { GenresPage } from '#/components/admin/genres/genres-manager'

export const Route = createFileRoute('/admin/_authenticated/genres/')({
  head: () => ({
    meta: [
      { title: 'Genres · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: GenresPage,
})
