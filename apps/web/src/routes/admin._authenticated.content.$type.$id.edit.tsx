import { createFileRoute } from '@tanstack/react-router'
import { ContentResource } from '#/components/admin/content-resource'
import { EditContentView } from '#/components/admin/content-edit'

export const Route = createFileRoute(
  '/admin/_authenticated/content/$type/$id/edit',
)({
  head: () => ({
    meta: [
      { title: 'Edit draft · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ContentEditPage,
})
function ContentEditPage() {
  const { type, id } = Route.useParams()
  return (
    <ContentResource type={type} id={id}>
      {(detail) => (
        <EditContentView
          key={`${detail.type}:${detail.data.id}`}
          detail={detail}
        />
      )}
    </ContentResource>
  )
}
