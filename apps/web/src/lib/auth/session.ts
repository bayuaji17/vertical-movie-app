import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import {
  apiBaseUrlFromOrigin,
  createApiClient,
  getBrowserApiBaseUrl,
  normalizeApiBaseUrl,
} from './api-client'
import type { AdminSessionDto, ApiFetcher } from './api-client'

export type AdminSessionState =
  | { status: 'authenticated'; session: AdminSessionDto }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | {
      status: 'unavailable'
      reason: 'configuration' | 'network' | 'upstream'
      httpStatus?: number
    }

export type LoadAdminSessionOptions = {
  apiBaseUrl: string
  cookie?: string
  signal?: AbortSignal
  fetcher?: ApiFetcher
}

export async function loadAdminSession({
  apiBaseUrl,
  cookie,
  signal,
  fetcher = fetch,
}: LoadAdminSessionOptions): Promise<AdminSessionState> {
  if (!apiBaseUrl || !normalizeApiBaseUrl(apiBaseUrl)) {
    return { status: 'unavailable', reason: 'configuration' }
  }

  const requestFetcher: ApiFetcher = (input, init) => {
    const headers = new Headers(init?.headers)
    if (cookie) headers.set('cookie', cookie)
    return fetcher(input, { ...init, headers })
  }

  try {
    const api = createApiClient(apiBaseUrl, requestFetcher)
    const result = await api.admin.session.get({
      fetch: { signal, cache: 'no-store' },
    })
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Request aborted.', 'AbortError')
    }
    if (
      result.status === 503 &&
      result.error &&
      result.error.value instanceof Error
    ) {
      return { status: 'unavailable', reason: 'network' }
    }

    if (result.data) {
      return {
        status: 'authenticated',
        session: {
          user: {
            id: result.data.user.id,
            name: result.data.user.name,
            email: result.data.user.email,
          },
          session: { expiresAt: result.data.session.expiresAt },
        },
      }
    }
    if (result.status === 401) return { status: 'unauthenticated' }
    if (result.status === 403) return { status: 'forbidden' }
    return {
      status: 'unavailable',
      reason: 'upstream',
      httpStatus: result.status,
    }
  } catch (error) {
    if (signal?.aborted) throw error
    return { status: 'unavailable', reason: 'upstream' }
  }
}

const getAdminSessionOnServer = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminSessionState> => {
    const request = getRequest()
    const internalOrigin = process.env.API_INTERNAL_URL
    if (!internalOrigin) {
      return { status: 'unavailable', reason: 'configuration' }
    }

    const apiBaseUrl = apiBaseUrlFromOrigin(internalOrigin)
    if (!apiBaseUrl) {
      return { status: 'unavailable', reason: 'configuration' }
    }

    return loadAdminSession({
      apiBaseUrl,
      cookie: request.headers.get('cookie') ?? undefined,
      signal: request.signal,
    })
  },
)

export function adminSessionQueryOptions() {
  return queryOptions({
    queryKey: ['auth', 'admin-session'] as const,
    queryFn: ({ signal }): Promise<AdminSessionState> => {
      if (typeof window === 'undefined') return getAdminSessionOnServer()

      const apiBaseUrl = getBrowserApiBaseUrl()
      if (!apiBaseUrl) {
        return Promise.resolve({
          status: 'unavailable',
          reason: 'configuration',
        })
      }
      return loadAdminSession({ apiBaseUrl, signal })
    },
  })
}
