import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { browserDashboardClient } from '#/lib/admin/dashboard-client'
import {
  dashboardSummaryOptions,
  dashboardKeys,
} from '#/lib/admin/dashboard-queries'
import { registerPrivateEffect } from '#/lib/auth/private-effects'

function subscribe(update: () => void) {
  const unsubscribe = onlineManager.subscribe(update)
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  document.addEventListener('visibilitychange', update)
  return () => {
    unsubscribe()
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
    document.removeEventListener('visibilitychange', update)
  }
}
const snapshot = () =>
  `${document.visibilityState}:${navigator.onLine && onlineManager.isOnline()}`
export function useDashboardSummary() {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    identity = user.id
  const client = useMemo(() => browserDashboardClient(cache), [cache])
  // Owned by the effect so a StrictMode/remount cycle gets a fresh signal
  // instead of reusing one that stopAdminPrivateEffects already aborted.
  const [controller, setController] = useState<AbortController>()
  const [, redraw] = useState(0),
    environment = useSyncExternalStore(
      subscribe,
      snapshot,
      () => 'hidden:true',
    ),
    online = environment.endsWith(':true'),
    visible = environment.startsWith('visible:')
  useEffect(() => {
    const owner = new AbortController()
    const stop = () => {
      owner.abort()
      redraw((n) => n + 1)
    }
    const remove = registerPrivateEffect(cache, stop)
    setController(owner)
    return () => {
      remove()
      owner.abort()
      setController(undefined)
      void cache.cancelQueries({
        queryKey: dashboardKeys.summary(identity),
        exact: true,
      })
    }
  }, [cache, identity])
  const query = useQuery({
    ...dashboardSummaryOptions(client, identity, controller?.signal),
    enabled:
      typeof window !== 'undefined' &&
      !!controller &&
      !controller.signal.aborted &&
      visible &&
      online,
  })
  return {
    query,
    online,
    visible,
    refresh: () => {
      if (
        online &&
        visible &&
        controller &&
        !controller.signal.aborted &&
        !query.isFetching
      )
        void query.refetch({ cancelRefetch: false })
    },
  }
}
