import { ThemeMenu } from './theme-menu'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  RiArrowDownSLine,
  RiMenuLine,
  RiPlayFill,
  RiDashboardLine,
} from '@remixicon/react'
import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '#/components/ui/dropdown-menu'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '#/components/ui/sheet'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { AdminLogout } from './admin-logout'
import { useAdminLogout } from '#/hooks/use-admin-logout'
import { contentSearch } from '#/lib/admin/content-list-state'

function Brand() {
  return (
    <span className="flex items-center gap-2 font-heading font-semibold">
      <span className="rounded-xl bg-primary p-2 text-primary-foreground">
        <RiPlayFill className="size-5" aria-hidden="true" />
      </span>
      Vertical Movie
    </span>
  )
}
export function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useAdminPrincipal()
  const [drawer, setDrawer] = useState(false)
  const logout = useAdminLogout()
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join('')
      .toUpperCase() || 'AD'
  const navigation = (
    <nav
      aria-label="Admin navigation"
      className="flex min-h-0 flex-1 flex-col p-4"
    >
      <Link
        to="/admin"
        onClick={() => setDrawer(false)}
        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring"
        activeProps={{ className: 'bg-primary/15' }}
        activeOptions={{ exact: true }}
      >
        <RiDashboardLine className="size-5" aria-hidden="true" />
        Dashboard
      </Link>
      <Link
        to="/admin/content"
        search={contentSearch({})}
        onClick={() => setDrawer(false)}
        className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring"
        activeProps={{ className: 'bg-primary/15' }}
      >
        Content
      </Link>
      <div className="mt-auto pt-8">
        <AdminLogout {...logout} />
      </div>
    </nav>
  )
  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:rounded-xl focus:bg-card focus:p-4"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-20 items-center border-b px-6">
          <Brand />
        </div>
        {navigation}
      </aside>
      <div className="min-w-0 lg:pl-60">
        <header className="flex h-20 items-center justify-between gap-2 border-b bg-card px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={drawer} onOpenChange={setDrawer}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    className="size-11 lg:hidden"
                    aria-label="Open navigation"
                  />
                }
              >
                <RiMenuLine aria-hidden="true" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="max-w-72"
                showCloseButton={false}
              >
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>
                    Vertical Movie administration
                  </SheetDescription>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setDrawer(false)}
                  >
                    Close navigation
                  </Button>
                </SheetHeader>
                {navigation}
              </SheetContent>
            </Sheet>
            <span className="lg:hidden">
              <Brand />
            </span>
            <span className="hidden text-sm text-muted-foreground lg:inline">
              Administration
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  aria-label="Account menu"
                  className="min-h-11 gap-2 px-2"
                />
              }
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{user.name}</span>
              <RiArrowDownSLine aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 max-w-[calc(100vw-2rem)]"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="grid gap-1 p-3">
                  <span className="text-sm font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="break-all">{user.email}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <ThemeMenu />
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main
          id="admin-main"
          className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
