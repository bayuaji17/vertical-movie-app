import {
  publicTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import {
  contentDetailOptions,
  loadContent,
  setContentHttpStatus,
} from '#/lib/catalog/content-queries'
import type { CatalogItem } from '#/lib/catalog/public-catalog-model'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ContentPage,
  ContentShell,
  ContentFailure,
} from '#/components/catalog/content-page'
import { contentSlug } from '#/lib/catalog/content-model'

export const Route = createFileRoute('/titles/$kind/$slug')({
  loader: async ({ context, params }) => {
    if (
      (params.kind !== 'movie' && params.kind !== 'standalone') ||
      !contentSlug.safeParse(params.slug).success
    ) {
      setContentHttpStatus(404)
      return { detailStatus: 404, episodesStatus: null, metadata: undefined }
    }
    const result = await loadContent(
      context.queryClient,
      params.kind,
      params.slug,
    )
    const item = context.queryClient.getQueryData<{ item: CatalogItem }>(
      contentDetailOptions(params.kind, params.slug).queryKey,
    )?.item
    return {
      ...result,
      metadata: item
        ? { title: item.title, description: item.synopsis }
        : undefined,
    }
  },
  head: ({ matches, loaderData }) => {
    const settings = settingsFromMatches(matches),
      item = loaderData?.metadata
    return {
      meta: publicMeta(
        settings,
        publicTitle(settings, item?.title ?? 'Title details'),
        item?.description,
      ),
    }
  },
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
