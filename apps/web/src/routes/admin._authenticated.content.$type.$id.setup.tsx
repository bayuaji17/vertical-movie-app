import { createFileRoute } from '@tanstack/react-router'
import { SetupPage } from '#/components/admin/setup/setup-page'
import { setupSearch } from '#/lib/admin/setup-flow'

export const Route = createFileRoute(
  '/admin/_authenticated/content/$type/$id/setup',
)({
  validateSearch: setupSearch,
  head: () => ({
    meta: [
      { title: 'Add a video · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SetupRoute,
})
function SetupRoute() {
  const { type, id } = Route.useParams(),
    { step } = Route.useSearch()
  return <SetupPage type={type} id={id} step={step} />
}
