import { onlineManager, queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type { DashboardClient, DashboardSummary } from './dashboard-client'
import { PrivateApiError } from '../api/private-result'

export const dashboardKeys = {
  summary: (identity: string) =>
    ['admin', identity, 'dashboard', 'summary'] as const,
}
export function dashboardPollInterval(
  success: boolean,
  visible = typeof document !== 'undefined' &&
    document.visibilityState === 'visible',
  online = onlineManager.isOnline(),
) {
  return success && visible && online ? 30000 : false
}
export function dashboardSummaryOptions(
  client: DashboardClient | undefined,
  identity: string,
  ownerSignal?: AbortSignal,
) {
  return queryOptions<DashboardSummary>({
    queryKey: dashboardKeys.summary(identity),
    enabled: typeof window !== 'undefined',
    retry: false,
    staleTime: 15000,
    gcTime: 300000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      dashboardPollInterval(query.state.status === 'success'),
    queryFn: async ({ signal }) => {
      if (!client)
        throw new PrivateApiError(
          0,
          'CONFIG_UNAVAILABLE',
          'Dashboard configuration is unavailable.',
        )
      const scoped = ownerSignal
        ? AbortSignal.any([signal, ownerSignal])
        : signal
      const value = await client.summary(scoped)
      if (scoped.aborted) throw new DOMException('Aborted', 'AbortError')
      return value
    },
  })
}
export async function invalidateDashboard(
  cache: QueryClient,
  identity: string,
) {
  const queryKey = dashboardKeys.summary(identity)
  await cache.cancelQueries({ queryKey, exact: true })
  await cache.invalidateQueries({ queryKey, exact: true, refetchType: 'none' })
}
