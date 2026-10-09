import { useEffect } from 'react'
import { useSiteSettings } from '#/hooks/use-site-settings'
import { bootstrapPublicSettings } from '#/lib/settings/queries'
import { defaultSiteSettings } from '#/lib/settings/model'
import { ThemeProvider } from '#/lib/theme/provider'
import { themeBootstrap } from '#/lib/theme/preferences'
import {
  HeadContent,
  useRouter,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '#/components/ui/toast'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async ({ context }) => ({
    settings: await bootstrapPublicSettings(context.queryClient),
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title:
          loaderData?.settings?.item.siteName ?? defaultSiteSettings.siteName,
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <SettingsHeadSync />
          {children}
          <Toaster />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function SettingsHeadSync() {
  const { query } = useSiteSettings(),
    router = useRouter(),
    version = query.data?.version
  useEffect(() => {
    const root = router.state.matches.find((m) => m.routeId === '__root__')
      ?.loaderData as { settings?: { version: number } } | undefined
    if (version && root?.settings?.version !== version)
      void router.invalidate({ filter: (m) => m.routeId === '__root__' })
  }, [version, router])
  return null
}
