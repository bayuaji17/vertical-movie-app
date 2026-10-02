import { queryOptions } from '@tanstack/react-query'
import { createIsomorphicFn } from '@tanstack/react-start'
import { readClientSession, isAdminSession } from '@repo/auth/client'
import type { SessionSnapshot } from '@repo/auth/types'
import { authClient } from './client'
import { readSessionOnServer } from './session.server'
import { adminSessionQueryKey } from './login'

export const readSession = createIsomorphicFn()
  .server(readSessionOnServer)
  .client((options: { signal?: AbortSignal; authoritative?: boolean } = {}) =>
    readClientSession(authClient, options),
  )

// Compatibility UI facade until the Query and protected route tasks cut over.
export type AdminSessionState =
  | { status: 'authenticated'; session: SessionSnapshot }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'unavailable' }

export function adminSessionQueryOptions() {
  return queryOptions({
    queryKey: adminSessionQueryKey,
    retry: false,
    queryFn: async ({ signal }): Promise<AdminSessionState> => {
      const session = await readSession({ signal })
      if (!session || Date.parse(session.session.expiresAt) <= Date.now())
        return { status: 'unauthenticated' }
      if (!isAdminSession(session)) return { status: 'forbidden' }
      return { status: 'authenticated', session }
    },
  })
}
