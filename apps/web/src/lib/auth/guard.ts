import { redirect } from '@tanstack/react-router'
import { isAdminSession, AuthDependencyError } from '@repo/auth/client'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionSnapshot } from '@repo/auth/types'
import { adminSessionQueryOptions } from './session'
import {
  clearAdminDataQueries,
  clearAdminPrivateQueries,
} from './session-cache'
import { validateAdminRedirect } from './login'

export class AdminAccessDeniedError extends Error {
  constructor() {
    super('This account does not have administrator access.')
    this.name = 'AdminAccessDeniedError'
  }
}

export async function redirectActiveAdmin(
  queryClient: QueryClient,
  returnTo: string,
  read = () => queryClient.query(adminSessionQueryOptions()),
): Promise<void> {
  let snapshot: SessionSnapshot | null
  try {
    snapshot = await read()
  } catch (error) {
    // Login remains available when the service cannot confirm a session.
    if (error instanceof AuthDependencyError) return
    throw error
  }
  if (isAdminSession(snapshot)) {
    throw redirect({
      href: validateAdminRedirect(returnTo),
      replace: true,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
}

export async function requireAdminSession(
  queryClient: QueryClient,
  href: string,
  read = () => queryClient.query(adminSessionQueryOptions()),
): Promise<SessionSnapshot> {
  let snapshot: SessionSnapshot | null
  try {
    snapshot = await read()
  } catch (error) {
    await clearAdminDataQueries(queryClient)
    throw error
  }
  if (!snapshot || Date.parse(snapshot.session.expiresAt) <= Date.now()) {
    await clearAdminPrivateQueries(queryClient)
    throw redirect({
      to: '/admin/login',
      search: { redirect: validateAdminRedirect(href) },
      replace: true,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
  if (!isAdminSession(snapshot)) {
    await clearAdminDataQueries(queryClient)
    throw new AdminAccessDeniedError()
  }
  return snapshot
}
