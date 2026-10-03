import { createFileRoute, Link } from '@tanstack/react-router'
import { RiArrowLeftLine, RiFilmLine, RiPlayFill } from '@remixicon/react'

import loginArtwork from '#/assets/login-artwork.png'
import { AdminLoginForm } from '#/components/auth/login-form'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { validateAdminRedirect } from '#/lib/auth/login'
import { redirectActiveAdmin } from '#/lib/auth/guard'

export const Route = createFileRoute('/admin/login')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: validateAdminRedirect(search.redirect),
  }),
  beforeLoad: ({ context, search }) =>
    redirectActiveAdmin(context.queryClient, search.redirect),
  head: () => ({
    meta: [
      { title: 'Masuk admin · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const { redirect } = Route.useSearch()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-10">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span
            className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <RiPlayFill className="size-6" />
          </span>
          <span className="flex flex-col">
            <span className="font-heading text-base font-semibold tracking-tight sm:text-lg">
              Vertical Movie
            </span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </span>
        </Link>
        <Button variant="ghost" nativeButton={false} render={<Link to="/" />}>
          <RiArrowLeftLine data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">Kembali ke beranda</span>
          <span className="sm:hidden">Beranda</span>
        </Button>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-8 xl:gap-16">
        <aside
          className="hidden rounded-3xl bg-muted/50 p-8 lg:flex lg:flex-col xl:p-10"
          aria-labelledby="login-studio-title"
        >
          <Badge variant="outline" className="h-8 px-3">
            <RiFilmLine data-icon="inline-start" aria-hidden="true" />
            Studio admin
          </Badge>
          <h2
            id="login-studio-title"
            className="mt-6 font-heading text-4xl font-semibold tracking-tight xl:text-5xl"
          >
            Kelola video
            <br />
            vertikal.
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
            Unggah, siapkan, dan terbitkan video dari satu dashboard.
          </p>
          <div className="relative -mt-4 h-96 overflow-hidden">
            <img
              src={loginArtwork}
              alt=""
              width={1024}
              height={1536}
              className="absolute inset-x-0 -top-16 h-[32rem] w-full object-contain"
            />
          </div>
        </aside>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <AdminLoginForm redirectTo={redirect} />
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        Vertical Movie · Panel administrator
      </footer>
    </div>
  )
}
