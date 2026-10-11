import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { ThemeContext } from '../src/lib/theme/context'

const paths = ['/', '/videos/$slug', '/series/$slug', '/watch/$slug']

/** Server-render a public component inside a router that knows the public paths. */
export async function renderPublic(ui: ReactNode, client = new QueryClient()) {
  const root = createRootRoute({ component: () => <>{ui}</> })
  const router = createRouter({
    routeTree: root.addChildren(
      paths.map((path) => createRoute({ getParentRoute: () => root, path })),
    ),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return renderToString(
    <QueryClientProvider client={client}>
      <ThemeContext value={{ mode: 'system', setMode: () => undefined }}>
        <RouterProvider router={router} />
      </ThemeContext>
    </QueryClientProvider>,
  ).replaceAll('<!-- -->', '')
}
/** Every interactive element in the markup, as opening tags. */
export function interactive(html: string) {
  return html.match(/<(a|button|select|input)\b[^>]*>/g) ?? []
}
