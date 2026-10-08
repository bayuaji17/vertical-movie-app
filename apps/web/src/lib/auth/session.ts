import { onlineManager, queryOptions } from '@tanstack/react-query'
import { createIsomorphicFn } from '@tanstack/react-start'
import { readClientSession, isAdminSession } from '@repo/auth/client'
import type { SessionSnapshot } from '@repo/auth/types'
import { authClient } from './client'
import {
  readSessionOnServer,
  setAuthFailureStatusOnServer,
} from './session.server'
import { sessionQueryKey } from './session-cache'

export const readSession = createIsomorphicFn()
  .server(readSessionOnServer)
  .client((options: { signal?: AbortSignal; authoritative?: boolean } = {}) =>
    readClientSession(authClient, options),
  )

export const setAuthFailureStatus = createIsomorphicFn()
  .server(setAuthFailureStatusOnServer)
  .client((_status: 403 | 503) => undefined)

export type AdminSessionState =
  | { status: 'authenticated'; session: SessionSnapshot }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'unavailable' }

export function sessionState(
  snapshot: SessionSnapshot | null | undefined,
): AdminSessionState {
  if (!snapshot || Date.parse(snapshot.session.expiresAt) <= Date.now())
    return { status: 'unauthenticated' }
  if (!isAdminSession(snapshot)) return { status: 'forbidden' }
  return { status: 'authenticated', session: snapshot }
}

export function adminSessionQueryOptions(
  options: { authoritative?: boolean } = {},
) {
  return queryOptions<SessionSnapshot | null>({
    queryKey: sessionQueryKey,
    gcTime: 300_000,
    retry: false,
    staleTime: (query) => {
      if (query.state.status === 'error') return 0
      const expiresAt = query.state.data?.session.expiresAt
      return expiresAt
        ? Math.max(
            0,
            Math.min(60_000, Date.parse(expiresAt) - query.state.dataUpdatedAt),
          )
        : 60_000
    },
    queryFn: ({ signal }) =>
      readSession({ signal, authoritative: options.authoritative }),
  })
}

export function sessionObserverOptions() {
  return {
    ...adminSessionQueryOptions(),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: () =>
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      onlineManager.isOnline()
        ? 60_000
        : false,
  }
}
