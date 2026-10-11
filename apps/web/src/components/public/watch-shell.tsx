import { Link } from '@tanstack/react-router'
import { RiArrowLeftLine } from '@remixicon/react'
import type { ReactNode } from 'react'
import { AppearanceMenu } from '#/components/catalog/appearance-menu'
import { Button } from '#/components/ui/button'
import { useSiteSettings } from '#/hooks/use-site-settings'
import type { WatchBack } from '#/lib/catalog/watch-model'

const labels = {
  home: 'Back to browse',
  video: 'Back to details',
  series: 'Back to series',
} as const

/** Slim 56 px top bar instead of the 80 px public header, so the player gets the room. */
export function WatchShell({
  title,
  back,
  children,
}: {
  title: string
  back: WatchBack
  children: ReactNode
}) {
  const { settings } = useSiteSettings()
  const label = labels[back.to]
  const content = (
    <>
      <RiArrowLeftLine data-icon="inline-start" aria-hidden="true" />
      <span className="max-lg:sr-only">Back</span>
    </>
  )
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:min-h-11 focus:p-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background px-2 sm:px-4">
        <Button
          variant="ghost"
          className="min-h-11 shrink-0"
          aria-label={label}
          nativeButton={false}
          role="link"
          render={
            back.to === 'series' ? (
              <Link to="/series/$slug" params={{ slug: back.slug }} />
            ) : back.to === 'video' ? (
              <Link
                to="/videos/$slug"
                params={{ slug: back.slug }}
                preload={false}
              />
            ) : (
              <Link to="/" preload={false} />
            )
          }
        >
          {content}
        </Button>
        <p className="min-w-0 flex-1 truncate font-heading text-[15px] font-semibold">
          {title}
        </p>
        <AppearanceMenu />
      </header>
      <main id="main-content" tabIndex={-1} className="w-full flex-1">
        {children}
      </main>
      {settings.footerText && (
        <footer className="mx-auto w-full max-w-[1440px] px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-10">
          <p className="[overflow-wrap:anywhere]">{settings.footerText}</p>
        </footer>
      )}
    </div>
  )
}
