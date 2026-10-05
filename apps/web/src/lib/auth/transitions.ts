import type { QueryClient } from '@tanstack/react-query'
import type { SessionSnapshot } from '@repo/auth/types'
import { isAdminSession } from '@repo/auth/client'
import { adminSessionQueryOptions, readSession } from './session'
import {
  clearAdminPrivateQueries,
  clearAdminDataQueries,
} from './session-cache'
import { AdminAccessDeniedError } from './guard'

export async function refreshAdminSession(queryClient: QueryClient) {
  await clearAdminPrivateQueries(queryClient)
  return queryClient.query({
    ...adminSessionQueryOptions({ authoritative: true }),
    staleTime: 0,
  })
}
export async function verifyAdminLogin(queryClient: QueryClient) {
  const snapshot = await refreshAdminSession(queryClient)
  if (!isAdminSession(snapshot)) throw new AdminAccessDeniedError()
  return snapshot
}
export async function handlePrivateApiFailure(
  queryClient: QueryClient,
  status: number,
) {
  if (status === 401) {
    await clearAdminPrivateQueries(queryClient)
    return
  }
  if (status === 403 || status >= 500) {
    await recheckAdminSession(queryClient).catch(() => undefined)
  }
}
// A metadata outage must not unmount a dirty form while authorization is valid.
// Session query errors still lock the layout, and invalid sessions remove data.
export async function recheckAdminSession(
  queryClient: QueryClient,
  reader: (options: {
    signal?: AbortSignal
    authoritative?: boolean
  }) => Promise<SessionSnapshot | null> = readSession,
) {
  try {
    const snapshot = await queryClient.query({
      ...adminSessionQueryOptions({ authoritative: true }),
      staleTime: 0,
      queryFn: ({ signal }) => reader({ signal, authoritative: true }),
    })
    if (!isAdminSession(snapshot)) await clearAdminDataQueries(queryClient)
    return snapshot
  } catch (error) {
    await clearAdminDataQueries(queryClient)
    throw error
  }
}
export function publishAuthChange() {
  if (typeof BroadcastChannel === 'undefined') return
  if (notificationChannel) {
    notificationChannel.postMessage({ type: 'auth-changed' })
    return
  }
  const channel = new BroadcastChannel('vertical-movie-admin-auth')
  channel.postMessage({ type: 'auth-changed' })
  channel.close()
}
// Notification transport only; never stores a session, principal or token.
let notificationChannel: BroadcastChannel | undefined
export function subscribeAuthChanges(
  queryClient: QueryClient,
  onChange: () => Promise<unknown>,
) {
  const channel = new BroadcastChannel('vertical-movie-admin-auth')
  notificationChannel = channel
  let pending = false
  let queued = false
  let closed = false
  const isOpen = () => !closed
  channel.onmessage = async ({ data }: MessageEvent<unknown>) => {
    if (
      closed ||
      !data ||
      typeof data !== 'object' ||
      !('type' in data) ||
      data.type !== 'auth-changed'
    )
      return
    queued = true
    if (pending) return
    pending = true
    try {
      while (queued && isOpen()) {
        queued = false
        await refreshAdminSession(queryClient).catch(() => undefined)
      }
      if (isOpen()) await onChange()
    } finally {
      pending = false
    }
  }
  return () => {
    closed = true
    channel.close()
    if (notificationChannel === channel) notificationChannel = undefined
  }
}
