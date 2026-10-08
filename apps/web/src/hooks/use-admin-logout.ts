import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '#/lib/auth/client'
import { clearAdminPrivateQueries } from '#/lib/auth/session-cache'
import { publishAuthChange } from '#/lib/auth/transitions'
import { stopAdminPrivateEffects } from '#/lib/auth/private-effects'
import { toast } from '#/components/ui/toast'

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
