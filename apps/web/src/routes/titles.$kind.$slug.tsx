import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ContentPage,
  ContentShell,
  ContentFailure,
} from '#/components/catalog/content-page'
import {
  loadContent,
  setContentHttpStatus,
} from '#/lib/catalog/content-queries'
import { contentSlug } from '#/lib/catalog/content-model'

export const Route = createFileRoute('/titles/$kind/$slug')({
  loader: ({ context, params }) => {
    if (
      (params.kind !== 'movie' && params.kind !== 'standalone') ||
      !contentSlug.safeParse(params.slug).success
    ) {
      setContentHttpStatus(404)
      return { detailStatus: 404, episodesStatus: null }
    }
    return loadContent(context.queryClient, params.kind, params.slug)
  },
  head: () => ({ meta: [{ title: 'Title details — Vertical Movie' }] }),
  component: Details,
})
function Details() {
  const { kind, slug } = Route.useParams(),
    bootstrap = Route.useLoaderData(),
    router = useRouter()
  if (kind !== 'movie' && kind !== 'standalone')
    return (
      <ContentShell>
        <ContentFailure
          status={404}
          busy={false}
          onRetry={() => {
            void router.invalidate()
          }}
        />
      </ContentShell>
    )
  return (
    <ContentPage
      key={kind + ':' + slug}
      kind={kind}
      slug={slug}
      bootstrap={bootstrap}
    />
  )
}
