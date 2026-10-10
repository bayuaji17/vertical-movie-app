import { createFileRoute } from '@tanstack/react-router'
import { CreateContentView } from '#/components/admin/content-create'

export const Route = createFileRoute('/admin/_authenticated/content/new')({
  head: () => ({
    meta: [
      { title: 'Add a video · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: CreateContentView,
})
