import { describe, expect, test } from 'bun:test'

import { getContext } from '../src/integrations/tanstack-query/root-provider'
import {
  apiBaseUrlFromOrigin,
  apiOriginFromOrigin,
  createApiClient,
  normalizeApiBaseUrl,
} from '../src/lib/auth/api-client'
import type { ApiFetcher } from '../src/lib/auth/api-client'
import { loadAdminSession } from '../src/lib/auth/session'

const apiBaseUrl = 'http://api.internal.test/api'

function sessionResponse(status = 200): Response {
  return Response.json(
    status === 200
      ? {
          user: { id: 'admin-id', name: 'Admin', email: 'admin@example.test' },
          session: { expiresAt: '2026-10-02T00:00:00.000Z' },
        }
      : {
          error: {
            code: 'AUTH_ERROR',
            message: 'Request was denied.',
            requestId: 'request-id',
          },
        },
    { status, headers: { 'cache-control': 'no-store' } },
  )
}

describe('admin session client', () => {
  test('uses a type-only API contract and keeps date strings serializable', async () => {
    let requestedUrl = ''
    let requestInit: RequestInit | undefined
    const api = createApiClient(apiBaseUrl, async (input, init) => {
      requestedUrl = String(input)
      requestInit = init
      return sessionResponse()
    })

    const response = await api.admin.session.get()
    expect(requestedUrl).toBe(`${apiBaseUrl}/admin/session`)
    expect(response.data?.session.expiresAt).toBe('2026-10-02T00:00:00.000Z')
    expect(requestInit?.credentials).toBe('include')
    expect(requestInit?.cache).toBe('no-store')
  })

  test('uses the API origin for direct SSR requests without the browser gateway prefix', async () => {
    let requestedUrl = ''
    const apiOrigin = apiOriginFromOrigin('http://api.internal.test')
    expect(apiOrigin).toBe('http://api.internal.test')
    expect(apiOrigin).toBeDefined()

    const api = createApiClient(apiOrigin!, async (input) => {
      requestedUrl = String(input)
      return sessionResponse(401)
    })

    const response = await api.admin.session.get()
    expect(requestedUrl).toBe('http://api.internal.test/admin/session')
    expect(response.status).toBe(401)
  })

  test('isolates cookies and abort signals across concurrent SSR requests', async () => {
    const observed = new Map<string, string | null>()
    const controllers = [new AbortController(), new AbortController()]
    const fetcher: ApiFetcher = async (input, init) => {
      expect(String(input)).toBe(`${apiBaseUrl}/admin/session`)
      const cookie = new Headers(init?.headers).get('cookie')
      const requestId = cookie === 'session=first' ? '0' : '1'
      observed.set(requestId, cookie)
      expect(init?.signal).toBe(controllers[Number(requestId)]?.signal)
      return sessionResponse()
    }

    const states = await Promise.all([
      loadAdminSession({
        apiBaseUrl,
        cookie: 'session=first',
        signal: controllers[0]?.signal,
        fetcher,
      }),
      loadAdminSession({
        apiBaseUrl,
        cookie: 'session=second',
        signal: controllers[1]?.signal,
        fetcher,
      }),
    ])

    expect(states.map((state) => state.status)).toEqual([
      'authenticated',
      'authenticated',
    ])
    expect(observed.get('0')).toBe('session=first')
    expect(observed.get('1')).toBe('session=second')
    expect(JSON.stringify(states)).not.toContain('session=')
  })

  test('distinguishes unauthorized, forbidden, upstream, and network failures', async () => {
    const loadWithStatus = (status: number) =>
      loadAdminSession({
        apiBaseUrl,
        fetcher: async () => sessionResponse(status),
      })

    expect(await loadWithStatus(401)).toEqual({ status: 'unauthenticated' })
    expect(await loadWithStatus(403)).toEqual({ status: 'forbidden' })
    expect(await loadWithStatus(503)).toEqual({
      status: 'unavailable',
      reason: 'upstream',
      httpStatus: 503,
    })
    expect(
      await loadAdminSession({
        apiBaseUrl,
        fetcher: async () => {
          throw new TypeError('network details must not escape')
        },
      }),
    ).toEqual({ status: 'unavailable', reason: 'network' })

    const controller = new AbortController()
    controller.abort(new DOMException('Request cancelled.', 'AbortError'))
    await expect(
      loadAdminSession({ apiBaseUrl, signal: controller.signal }),
    ).rejects.toThrow('Request cancelled.')
  })

  test('validates configured origins and creates a fresh query cache per router', () => {
    expect(apiBaseUrlFromOrigin('https://web.example.test')).toBe(
      'https://web.example.test/api',
    )
    expect(apiBaseUrlFromOrigin('https://user:pass@web.example.test')).toBe(
      undefined,
    )
    expect(normalizeApiBaseUrl(apiBaseUrl)).toBe(apiBaseUrl)
    expect(normalizeApiBaseUrl('http://api.internal.test')).toBe(
      'http://api.internal.test',
    )
    expect(normalizeApiBaseUrl('https://api.example.test/other')).toBe(
      undefined,
    )
    expect(apiOriginFromOrigin('http://api.internal.test/api')).toBe(undefined)

    const firstQueryClient = getContext().queryClient
    const secondQueryClient = getContext().queryClient
    expect(firstQueryClient).not.toBe(secondQueryClient)
  })
})
