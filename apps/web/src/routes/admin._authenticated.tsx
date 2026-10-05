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
import { AdminShell } from '#/components/admin/admin-shell'
import { UploadSessionProvider } from '#/components/admin/upload-session-provider'

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
        <UploadSessionProvider>
          <AdminShell>
            <Outlet />
          </AdminShell>
        </UploadSessionProvider>
      </AdminSessionContext>
    )
  if (adminSessionState.status === 'forbidden') return <AdminAccessDenied />
  // A cleared/expired session is a redirect transition, not a service failure.
  if (adminSessionState.status === 'unauthenticated') return null
  return <AdminSessionUnavailable />
}

function AdminAccessDenied() {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/35 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            <h1>Admin access denied</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>This account does not have admin access.</AlertTitle>
            <AlertDescription>
              Contact the operator if you should have access.
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
          loading: { title: 'Checking session...' },
          success: {
            title: 'Session check complete',
            description: 'Your session status has been updated.',
          },
          error: {
            title: 'Session check failed',
            description:
              'The authentication service is unavailable. Try again.',
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
            <h1>Admin session unavailable</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert variant="destructive">
            <AlertTitle>The dashboard remains locked.</AlertTitle>
            <AlertDescription>
              The connection or authentication service is unavailable. Try again
              when the service is available.
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            className="w-full sm:w-fit"
            disabled={retrying}
            onClick={() => void retrySessionCheck()}
          >
            {retrying ? 'Checking...' : 'Try again'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
