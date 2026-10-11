import {
  publicTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import {
  contentDetailOptions,
  loadContent,
} from '#/lib/catalog/content-queries'
import type { CatalogItem } from '#/lib/catalog/public-catalog-model'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { SeriesDetail } from '#/components/public/series-detail'
import { isMissingContent } from '#/lib/public/missing-content'

export const Route = createFileRoute('/series/$slug')({
  loader: async ({ context, params }) => {
    const result = await loadContent(context.queryClient, 'series', params.slug)
    if (isMissingContent(result.detailStatus)) throw notFound()
    const item = context.queryClient.getQueryData<{ item: CatalogItem }>(
      contentDetailOptions('series', params.slug).queryKey,
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
        publicTitle(settings, item?.title ?? 'Series details'),
        item?.description,
      ),
    }
  },
  component: () => (
    <SeriesDetail
      key={Route.useParams().slug}
      slug={Route.useParams().slug}
      bootstrap={Route.useLoaderData()}
    />
  ),
})
