import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { RiLogoutBoxRLine, RiLoader4Line } from '@remixicon/react'
import { authClient } from '#/lib/auth/client'
import { clearAdminPrivateQueries } from '#/lib/auth/session-cache'
import { publishAuthChange } from '#/lib/auth/transitions'
import { Button } from '#/components/ui/button'
import { stopAdminPrivateEffects } from '#/lib/auth/private-effects'
import { toast } from '#/components/ui/toast'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'

export function useAdminLogout() {
  const router = useRouter(),
    cache = useQueryClient()
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string>()
  async function logout() {
    if (pending) return
    stopAdminPrivateEffects(cache)
    setPending(true)
    setError(undefined)
    try {
      await toast.promise(
        (async () => {
          const result = await authClient.signOut(undefined, { retry: 0 })
          if (result.error) throw result.error
          await clearAdminPrivateQueries(cache)
          publishAuthChange()
          await router.navigate({
            to: '/admin/login',
            search: { redirect: '/admin' },
            replace: true,
          })
          await router.invalidate()
        })(),
        {
          loading: {
            title: 'Logging out...',
            description: 'Closing your admin session.',
          },
          success: {
            title: 'Logged out',
            description: 'Your admin session has ended.',
          },
          error: {
            title: 'Log out failed',
            description:
              'Your session could not be confirmed as ended. Try logging out again.',
          },
        },
      )
    } catch {
      const message =
        'Your session could not be confirmed as ended. Try logging out again.'
      setError(message)
    } finally {
      setPending(false)
    }
  }
  return { pending, error, logout }
}
export function AdminLogout({
  pending,
  error,
  logout,
}: ReturnType<typeof useAdminLogout>) {
  return (
    <div className="grid gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Log out failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        variant="ghost"
        className="min-h-11 w-full justify-start"
        disabled={pending}
        aria-busy={pending}
        onClick={() => void logout()}
      >
        {pending ? (
          <RiLoader4Line
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <RiLogoutBoxRLine data-icon="inline-start" aria-hidden="true" />
        )}
        {pending ? 'Logging out...' : 'Log out'}
      </Button>
    </div>
  )
}
