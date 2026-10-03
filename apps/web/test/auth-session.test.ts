import { describe, expect, test } from 'bun:test'
import { createAuthClient, readClientSession } from '@repo/auth/client'
import { readServerSession, AuthDependencyError } from '@repo/auth/server'
import { getContext } from '../src/integrations/tanstack-query/root-provider'

const apiOrigin = 'http://api.internal.test'
const fixture = {
  user: {
    id: 'admin-id',
    name: 'Admin',
    email: 'admin@example.test',
    role: 'admin',
    banned: false,
  },
  session: {
    expiresAt: '2026-10-03T00:00:00.000Z',
    token: 'secret-session-token',
    ipAddress: 'private-ip',
  },
  account: { password: 'private-hash' },
}
describe('native session readers', () => {
  test('reads fixed native endpoint authoritatively, isolates cookies, and forwards multiple cookies', async () => {
    const observations: string[] = []
    const results = await Promise.all(
      ['first', 'second'].map(async (cookie) => {
        const cookies: string[] = []
        const session = await readServerSession({
          apiOrigin,
          cookie,
          onSetCookie: (values) => cookies.push(...values),
          fetcher: async (input, init) => {
            const url = new URL(String(input))
            expect(url.origin + url.pathname).toBe(
              apiOrigin + '/api/auth/get-session',
            )
            expect(url.searchParams.get('disableCookieCache')).toBe('true')
            expect(init?.cache).toBe('no-store')
            expect(init?.redirect).toBe('manual')
            observations.push(new Headers(init?.headers).get('cookie') ?? '')
            const headers = new Headers()
            headers.append('set-cookie', `cache=${cookie}; HttpOnly`)
            headers.append('set-cookie', `other=${cookie}; HttpOnly`)
            return Response.json(cookie === 'first' ? fixture : null, {
              headers,
            })
          },
        })
        return { session, cookies }
      }),
    )
    expect(observations.sort()).toEqual(['first', 'second'])
    expect(results[0]?.cookies).toEqual([
      'cache=first; HttpOnly',
      'other=first; HttpOnly',
    ])
    expect(results[1]?.session).toBeNull()
    const text = JSON.stringify(results[0]?.session)
    for (const value of [
      'secret-session-token',
      'private-ip',
      'private-hash',
      'account',
    ])
      expect(text).not.toContain(value)
    expect(results[0]?.session?.session.expiresAt).toBe(
      fixture.session.expiresAt,
    )
  })
  test('browser uses native SDK and projects the same DTO', async () => {
    const client = createAuthClient({
      baseURL: 'http://web.example',
      fetchOptions: {
        customFetchImpl: async (input, init) => {
          expect(String(input)).toContain('/api/auth/get-session')
          expect(init?.credentials).toBe('include')
          return Response.json(fixture)
        },
      },
    })
    const value = await readClientSession(client)
    expect(value?.user.role).toBe('admin')
    expect(Object.keys(value?.session ?? {})).toEqual(['expiresAt'])
  })
  test('preserves null, throws safe dependency errors, and bounds stalls', async () => {
    expect(
      await readServerSession({
        apiOrigin,
        fetcher: async () => Response.json(null),
      }),
    ).toBeNull()
    await expect(
      readServerSession({
        apiOrigin,
        fetcher: async () =>
          Response.json({ error: 'private detail' }, { status: 503 }),
      }),
    ).rejects.toBeInstanceOf(AuthDependencyError)
    await expect(
      readServerSession({
        apiOrigin,
        fetcher: async () => {
          throw new Error('private network detail')
        },
      }),
    ).rejects.toBeInstanceOf(AuthDependencyError)
    expect(() =>
      readServerSession({ apiOrigin: 'http://user:secret@foreign.test' }),
    ).toThrow(AuthDependencyError)
    const start = Date.now()
    await expect(
      readServerSession({
        apiOrigin,
        timeoutMs: 10,
        fetcher: async (_input, init) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener(
              'abort',
              () => reject(init.signal?.reason),
              { once: true },
            ),
          ),
      }),
    ).rejects.toMatchObject({ reason: 'timeout' })
    expect(Date.now() - start).toBeLessThan(1000)
  })
  test('keeps cancellation distinct and QueryClient state request-local', async () => {
    const controller = new AbortController()
    const reason = new DOMException('Cancelled', 'AbortError')
    controller.abort(reason)
    await expect(
      readServerSession({ apiOrigin, signal: controller.signal }),
    ).rejects.toBe(reason)
    const first = getContext()
    const second = getContext()
    first.queryClient.setQueryData(['auth', 'session'], fixture)
    expect(second.queryClient.getQueryData(['auth', 'session'])).toBeUndefined()
  })
})
