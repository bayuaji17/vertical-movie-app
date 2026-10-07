import { useState } from 'react'
import type { ReactNode } from 'react'
import { RiMenuLine, RiPlayFill, RiCloseLine } from '@remixicon/react'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '#/components/ui/sheet'
import { Separator } from '#/components/ui/separator'
import { AppearanceMenu } from './appearance-menu'

function Brand() {
  return (
    <span className="flex items-center gap-3 font-heading text-lg font-bold tracking-tight sm:text-xl">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <RiPlayFill className="size-5" aria-hidden="true" />
      </span>
      Vertical Movie
    </span>
  )
}
export function PublicShell({
  children,
  search,
  onHome,
  onBrowse,
}: {
  children: ReactNode
  search: ReactNode
  onHome: () => void
  onBrowse: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a href="#catalog" className="sr-only focus:not-sr-only focus:p-4">
        Skip to catalog
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1376px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:gap-6 lg:px-10">
          <button
            type="button"
            className="flex min-h-11 shrink-0 items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Vertical Movie home"
            onClick={onHome}
          >
            <Brand />
          </button>
          <nav
            aria-label="Main navigation"
            className="ml-auto hidden items-center gap-3 md:flex"
          >
            <Button variant="ghost" className="min-h-11" onClick={onHome}>
              Home
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={onBrowse}>
              Browse
            </Button>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:order-last md:ml-0">
            <AppearanceMenu />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    className="size-11 md:hidden"
                    variant="outline"
                    size="icon"
                    aria-label="Open navigation"
                  />
                }
              >
                <RiMenuLine aria-hidden="true" />
              </SheetTrigger>
              <SheetContent showCloseButton={false}>
                <SheetHeader className="pr-16">
                  <SheetTitle>Vertical Movie</SheetTitle>
                  <SheetDescription>Find your next story.</SheetDescription>
                </SheetHeader>
                <SheetClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 size-11"
                      aria-label="Close navigation"
                    />
                  }
                >
                  <RiCloseLine aria-hidden="true" />
                </SheetClose>
                <nav
                  aria-label="Mobile navigation"
                  className="flex flex-col gap-2 px-6"
                >
                  <Button
                    variant="ghost"
                    className="min-h-11 justify-start"
                    onClick={() => {
                      setOpen(false)
                      onHome()
                    }}
                  >
                    Home
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-11 justify-start"
                    onClick={() => {
                      setOpen(false)
                      onBrowse()
                    }}
                  >
                    Browse
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <div className="order-last w-full md:order-none md:ml-2 md:w-64 lg:w-72">
            {search}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1376px] flex-1 flex-col gap-7 px-4 py-7 sm:px-6 sm:py-9 lg:px-10">
        {children}
      </main>
      <Separator />
      <footer className="mx-auto flex w-full max-w-[1376px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <Brand />
        <p className="text-sm text-muted-foreground">
          Vertical stories. Open to everyone.
        </p>
      </footer>
    </div>
  )
}
