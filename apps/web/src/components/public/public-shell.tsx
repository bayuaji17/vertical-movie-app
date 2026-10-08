import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { RiPlayFill } from '@remixicon/react'
import { AppearanceMenu } from '#/components/catalog/appearance-menu'
import { Separator } from '#/components/ui/separator'
import type { CatalogType } from '#/lib/public/catalog-model'

export function PublicShell({
  children,
  type = 'all',
}: {
  children: ReactNode
  type?: CatalogType
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:min-h-11 focus:p-4"
      >
        Skip to content
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <Link
            to="/"
            search={{ type }}
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl font-heading text-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xl"
            aria-label="Vertical Movie home"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <RiPlayFill className="size-5" aria-hidden="true" />
            </span>
            <span>Vertical Movie</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex shrink-0 items-center gap-3 sm:gap-6"
          >
            <Link
              to="/"
              search={{ type }}
              className="hidden min-h-11 items-center rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              Browse
            </Link>
            <AppearanceMenu />
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-12"
      >
        {children}
      </main>
      <Separator />
      <footer className="mx-auto w-full max-w-[1440px] px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-10">
        Stories made for portrait.
      </footer>
    </div>
  )
}
