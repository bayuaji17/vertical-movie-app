import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import type {} from '@tanstack/react-start'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'
import { catalogType } from './lib/public/catalog-model'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    getScrollRestorationKey: (location) =>
      location.pathname === '/'
        ? 'public-catalog:' +
          catalogType(new URLSearchParams(location.searchStr).get('type'))
        : location.state.__TSR_key || location.href,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
