import { createFileRoute } from '@tanstack/react-router'

import { AdminLoginForm } from '#/components/auth/login-form'
import { validateAdminRedirect } from '#/lib/auth/login'

export const Route = createFileRoute('/admin/login')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: validateAdminRedirect(search.redirect),
  }),
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
    <main className="grid min-h-svh place-items-center bg-muted/35 px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <AdminLoginForm redirectTo={redirect} />
      </div>
    </main>
  )
}
