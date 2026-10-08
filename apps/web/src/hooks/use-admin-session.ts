import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionObserverOptions, sessionState } from '#/lib/auth/session'
import {
  sessionQueryKey,
  clearAdminDataQueries,
} from '#/lib/auth/session-cache'
import { stopAdminPrivateEffects } from '#/lib/auth/private-effects'

export function useAdminSession() {
  const queryClient = useQueryClient()
  const result = useQuery(sessionObserverOptions())
  const [, updateClock] = useState(0)
  const expiresAt = result.data?.session.expiresAt
  const state = result.isError
    ? ({ status: 'unavailable' } as const)
    : sessionState(result.data)
  useEffect(() => {
    if (state.status !== 'authenticated')
      void clearAdminDataQueries(queryClient)
  }, [state.status, queryClient])
  useEffect(() => {
    if (!expiresAt) return
    const timer = setTimeout(
      () => {
        stopAdminPrivateEffects(queryClient)
        updateClock((revision) => revision + 1)
        void queryClient
          .cancelQueries({ queryKey: sessionQueryKey })
          .then(() => {
            queryClient.setQueryData(sessionQueryKey, null)
          })
      },
      Math.max(0, Date.parse(expiresAt) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [expiresAt, queryClient])
  return {
    ...result,
    sessionState: state,
  }
}
