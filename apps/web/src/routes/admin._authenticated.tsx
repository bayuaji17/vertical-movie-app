import { useState } from 'react'
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { AuthDependencyError } from '@repo/auth/client'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  adminSessionQueryOptions,
  useAdminSession,
  sessionState,
} from '#/lib/auth/session'
import { validateAdminRedirect } from '#/lib/auth/login'
import { clearAdminPrivateQueries } from '#/lib/auth/session-cache'

export const Route = createFileRoute('/admin/_authenticated')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async ({ context, location }) => {
    const snapshot = await context.queryClient
      .query(adminSessionQueryOptions())
      .catch((error: unknown) => {
        if (error instanceof AuthDependencyError) return undefined
        throw error
      })

    const currentState =
      snapshot === undefined
        ? ({ status: 'unavailable' } as const)
        : sessionState(snapshot)
    if (currentState.status === 'unauthenticated') {
      await clearAdminPrivateQueries(context.queryClient)
      throw redirect({
        to: '/admin/login',
        search: { redirect: validateAdminRedirect(location.href) },
        replace: true,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    if (currentState.status === 'forbidden') {
      await clearAdminPrivateQueries(context.queryClient)
    }

    return { adminSessionState: currentState }
  },
  component: ProtectedAdminLayout,
})

function ProtectedAdminLayout() {
  const { sessionState: adminSessionState } = useAdminSession()
  if (adminSessionState.status === 'authenticated') return <Outlet />
  if (adminSessionState.status === 'forbidden') return <AdminAccessDenied />
  return <AdminSessionUnavailable />
}

function AdminAccessDenied() {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/35 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            <h1>Akses admin ditolak</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Akun ini tidak memiliki akses admin.</AlertTitle>
            <AlertDescription>
              Hubungi operator jika Anda seharusnya dapat mengelola aplikasi.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </main>
  )
}

function AdminSessionUnavailable() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  async function retrySessionCheck() {
    setRetrying(true)
    try {
      await clearAdminPrivateQueries(queryClient)
      await router.invalidate()
    } catch {
      // Keep the locked state visible; the operator can retry this check.
    } finally {
      setRetrying(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/35 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            <h1>Sesi admin belum dapat diperiksa</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert variant="destructive">
            <AlertTitle>Dashboard tetap terkunci.</AlertTitle>
            <AlertDescription>
              Koneksi atau layanan autentikasi sedang bermasalah. Coba lagi
              setelah layanan tersedia.
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            className="w-full sm:w-fit"
            disabled={retrying}
            onClick={() => void retrySessionCheck()}
          >
            {retrying ? 'Memeriksa...' : 'Coba lagi'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
