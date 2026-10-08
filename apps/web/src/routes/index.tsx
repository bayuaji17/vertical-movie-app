import { createFileRoute, redirect } from '@tanstack/react-router'
import { CatalogBrowser } from '#/components/public/catalog-browser'
import {
  catalogSearch,
  catalogType,
  catalogTypes,
} from '#/lib/public/catalog-model'
import { loadCatalog } from '#/lib/public/catalog-queries'
import { setPublicHttpStatus } from '#/lib/public/catalog-reader'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearch,
  beforeLoad: ({ location }) => {
    const type = new URLSearchParams(location.searchStr).get('type')
    if (type !== null && !catalogTypes.some((value) => value === type))
      throw redirect({ to: '/', search: { type: 'all' }, replace: true })
  },
  loaderDeps: ({ search }) => ({ type: catalogType(search.type) }),
  loader: async ({ context, deps }) => {
    const result = await loadCatalog(context.queryClient, deps.type)
    setPublicHttpStatus(result.status)
    return result
  },
  head: () => ({
    meta: [
      { title: 'Vertical Movie — Find your next story' },
      {
        name: 'description',
        content:
          'Discover films and standalone stories in portrait. Open to everyone.',
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: () => (
    <CatalogBrowser
      type={catalogType(Route.useSearch().type)}
      status={Route.useLoaderData().status}
    />
  ),
})
