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
import { createFileRoute, notFound } from '@tanstack/react-router'
import { ContentPage } from '#/components/catalog/content-page'
import { contentSlug } from '#/lib/catalog/content-model'
import { isMissingContent } from '#/lib/public/missing-content'

export const Route = createFileRoute('/titles/$kind/$slug')({
  loader: async ({ context, params }) => {
    if (
      (params.kind !== 'movie' && params.kind !== 'standalone') ||
      !contentSlug.safeParse(params.slug).success
    ) {
      setContentHttpStatus(404)
      throw notFound()
    }
    const result = await loadContent(
      context.queryClient,
      params.kind,
      params.slug,
    )
    const item = context.queryClient.getQueryData<{ item: CatalogItem }>(
      contentDetailOptions(params.kind, params.slug).queryKey,
    )?.item
    if (isMissingContent(result.detailStatus)) throw notFound()
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
    bootstrap = Route.useLoaderData()
  // The loader rejects unknown kinds; this narrows the type for rendering.
  if (kind !== 'movie' && kind !== 'standalone') throw notFound()
  return (
    <ContentPage
      key={kind + ':' + slug}
      kind={kind}
      slug={slug}
      bootstrap={bootstrap}
    />
  )
}
