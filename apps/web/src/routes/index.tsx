import {
  homeTitle,
  publicMeta,
  settingsFromMatches,
} from '#/lib/settings/presentation'
import { createFileRoute } from '@tanstack/react-router'
import { CatalogBrowser } from '#/components/public/catalog-browser'
import { catalogSearch, catalogType } from '#/lib/public/catalog-model'
import { normalizeCatalogLocation } from '#/lib/public/catalog-navigation'
import { loadCatalog } from '#/lib/public/catalog-queries'
import { setPublicHttpStatus } from '#/lib/public/catalog-reader'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearch,
  beforeLoad: ({ location }) => normalizeCatalogLocation(location),
  loaderDeps: ({ search }) => ({ type: catalogType(search.type) }),
  loader: async ({ context, deps }) => {
    const result = await loadCatalog(context.queryClient, deps.type)
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
      status={Route.useLoaderData().status}
    />
  ),
})
