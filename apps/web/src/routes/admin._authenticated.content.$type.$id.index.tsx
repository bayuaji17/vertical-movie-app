import { createFileRoute } from '@tanstack/react-router'
import { ContentResource } from '#/components/admin/content-resource'
import { ContentDetailView } from '#/components/admin/content-detail'

export const Route = createFileRoute(
  '/admin/_authenticated/content/$type/$id/',
)({
  head: () => ({
    meta: [
      { title: 'Content details · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ContentDetailsPage,
})
function ContentDetailsPage() {
  const { type, id } = Route.useParams()
  return (
    <ContentResource type={type} id={id}>
      {(detail) => <ContentDetailView detail={detail} />}
    </ContentResource>
  )
}
