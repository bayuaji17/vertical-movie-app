import { useState, useEffect } from 'react'
import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { requireAdminSession, AdminAccessDeniedError } from '#/lib/auth/guard'
import { AdminSessionContext } from '#/lib/auth/session-context'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { toast } from '#/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useAdminSession, setAuthFailureStatus } from '#/lib/auth/session'
import { AuthDependencyError } from '@repo/auth/client'
import { sessionQueryKey } from '#/lib/auth/session-cache'

export const Route = createFileRoute('/admin/_authenticated')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async ({ context, location }) => {
    try {
      return {
        adminSession: await requireAdminSession(
          context.queryClient,
          location.href,
        ),
      }
    } catch (error) {
      if (error instanceof AdminAccessDeniedError) setAuthFailureStatus(403)
      if (error instanceof AuthDependencyError) setAuthFailureStatus(503)
      throw error
    }
  },
  errorComponent: ({ error }) =>
    error instanceof AdminAccessDeniedError ||
    (error instanceof Error && error.name === 'AdminAccessDeniedError') ? (
      <AdminAccessDenied />
    ) : (
      <AdminSessionUnavailable />
    ),
  component: ProtectedAdminLayout,
})

function ProtectedAdminLayout() {
  const { sessionState: adminSessionState, isFetching } = useAdminSession()
  const router = useRouter()
  useEffect(() => {
    if (adminSessionState.status === 'unauthenticated' && !isFetching)
      void router.navigate({
        to: '/admin/login',
        search: { redirect: '/admin' },
        replace: true,
      })
  }, [adminSessionState.status, isFetching, router])
  if (adminSessionState.status === 'authenticated')
    return (
      <AdminSessionContext value={adminSessionState.session}>
        <Outlet />
      </AdminSessionContext>
    )
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
      await toast.promise(
        (async () => {
          await queryClient.invalidateQueries({
            queryKey: sessionQueryKey,
            refetchType: 'none',
          })
          await router.invalidate()
          // Router invalidation can resolve even when beforeLoad fails.
          const state = queryClient.getQueryState(sessionQueryKey)
          if (state?.status !== 'success') {
            throw state?.error ?? new Error('Session check unavailable')
          }
        })(),
        {
          loading: { title: 'Memeriksa sesi...' },
          success: {
            title: 'Pemeriksaan sesi selesai',
            description: 'Status sesi berhasil diperbarui.',
          },
          error: {
            title: 'Pemeriksaan sesi gagal',
            description: 'Layanan autentikasi belum tersedia. Coba lagi.',
          },
        },
      )
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
