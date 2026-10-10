import {
  homeTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import { createFileRoute } from '@tanstack/react-router'
import { CatalogBrowser } from '#/components/public/catalog-browser'
import {
  browseFilters,
  catalogSearch,
  catalogType,
} from '#/lib/public/catalog-model'
import { normalizeBrowseLocation } from '#/lib/public/catalog-navigation'
import { loadBrowseCatalog } from '#/lib/catalog/public-catalog-queries'
import { setPublicHttpStatus } from '#/lib/public/catalog-reader'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearch,
  beforeLoad: ({ location }) => normalizeBrowseLocation(location),
  loaderDeps: ({ search }) => ({
    type: catalogType(search.type),
    q: search.q ?? '',
  }),
  loader: async ({ context, deps }) => {
    const result = await loadBrowseCatalog(
      context.queryClient,
      browseFilters(deps.type, deps.q),
    )
    setPublicHttpStatus(result.status)
    return result
  },
  head: ({ matches }) => {
    const settings = settingsFromMatches(matches)
    return {
      meta: [
        ...publicMeta(settings, homeTitle(settings)),
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    }
  },
  component: () => (
    <CatalogBrowser
      type={catalogType(Route.useSearch().type)}
      q={Route.useSearch().q ?? ''}
      status={Route.useLoaderData().status}
    />
  ),
})
