import { useState } from 'react'
import { RiLoader4Line, RiLogoutBoxRLine } from '@remixicon/react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { toast } from '#/components/ui/toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { authClient } from '#/lib/auth/client'
import { logoutErrorMessage } from '#/lib/auth/login'
import { clearAdminPrivateQueries } from '#/lib/auth/session-cache'
import type { SessionSnapshot } from '@repo/auth/types'
import { useAdminPrincipal } from '#/lib/auth/session-context'
import { publishAuthChange } from '#/lib/auth/transitions'

export const Route = createFileRoute('/admin/_authenticated/')({
  head: () => ({
    meta: [
      { title: 'Dashboard admin · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminDashboard,
})

function AdminDashboard() {
  return <AdminDashboardContent session={useAdminPrincipal()} />
}

function AdminDashboardContent({
  session: principal,
}: {
  session: SessionSnapshot
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string>()

  async function logout() {
    setLoggingOut(true)
    setLogoutError(undefined)
    try {
      await toast.promise(
        (async () => {
          const result = await authClient.signOut(undefined, { retry: 0 })
          if (result.error) throw result.error
          await clearAdminPrivateQueries(queryClient)
          publishAuthChange()
          await router.navigate({
            to: '/admin/login',
            search: { redirect: '/admin' },
            replace: true,
          })
          // Refresh cached route matches after leaving the protected layout.
          await router.invalidate()
        })(),
        {
          loading: {
            title: 'Memproses logout...',
            description: 'Menutup sesi admin.',
          },
          success: {
            title: 'Logout berhasil',
            description: 'Sesi admin telah berakhir.',
          },
          error: (error: unknown) => ({
            title: 'Logout gagal',
            description: logoutErrorMessage(error),
          }),
        },
      )
    } catch (error) {
      setLogoutError(logoutErrorMessage(error))
    } finally {
      setLoggingOut(false)
    }
  }

  const { user, session } = principal

  return (
    <main className="min-h-svh bg-muted/35 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Vertical Movie · Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Sesi admin aktif untuk {user.name}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-fit"
            disabled={loggingOut}
            aria-busy={loggingOut}
            onClick={() => void logout()}
          >
            {loggingOut ? (
              <>
                <RiLoader4Line
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
                Keluar...
              </>
            ) : (
              <>
                <RiLogoutBoxRLine data-icon="inline-start" aria-hidden="true" />
                Keluar
              </>
            )}
          </Button>
        </header>

        {logoutError ? (
          <Alert variant="destructive" aria-live="assertive">
            <AlertTitle>Logout gagal</AlertTitle>
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Akun administrator</h2>
            </CardTitle>
            <CardDescription>
              Informasi sesi yang sedang digunakan untuk mengelola aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-1">
                <dt className="text-sm text-muted-foreground">Nama</dt>
                <dd className="font-medium">{user.name}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="break-all font-medium">{user.email}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-muted-foreground">
                  Sesi berakhir (UTC)
                </dt>
                <dd className="font-medium">
                  <time dateTime={session.expiresAt}>{session.expiresAt}</time>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
