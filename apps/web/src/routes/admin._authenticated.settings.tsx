import { createFileRoute } from '@tanstack/react-router'
import { SettingsForm } from '#/components/admin/settings-form'

export const Route = createFileRoute('/admin/_authenticated/settings')({
  head: () => ({
    meta: [
      { title: 'Site settings · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SettingsForm,
})
