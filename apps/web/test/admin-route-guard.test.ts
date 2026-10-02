import { privateApiFetcher } from '../src/lib/api/client'
import { describe, expect, it } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  createMemoryHistory,
  isRedirect,
} from '@tanstack/react-router'
import type { SessionSnapshot } from '@repo/auth/types'
import { AuthDependencyError } from '@repo/auth/client'
import {
  requireAdminSession,
  AdminAccessDeniedError,
  redirectActiveAdmin,
} from '../src/lib/auth/guard'
import {
  clearAdminPrivateQueries,
  sessionQueryKey,
} from '../src/lib/auth/session-cache'

const admin: SessionSnapshot = {
  user: {
    id: 'test',
    name: 'Admin',
    email: 'admin@example.test',
    role: 'admin',
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60_000).toISOString() },
}
describe('admin beforeLoad and transitions', () => {
  for (const [name, snapshot] of [
    ['anonymous', null],
    ['user', { ...admin, user: { ...admin.user, role: 'user' } }],
    ['banned', { ...admin, user: { ...admin.user, banned: true } }],
    [
      'expired',
      { ...admin, session: { expiresAt: new Date(0).toISOString() } },
    ],
    ['admin', admin],
  ] as const) {
    it(`runs child loaders only for an allowed principal: ${name}`, async () => {
      const queryClient = new QueryClient()
      let loads = 0
      const root = createRootRouteWithContext<{ queryClient: QueryClient }>()()
      const parent = createRoute({
        getParentRoute: () => root,
        id: 'protected',
        beforeLoad: ({ context, location }) =>
          requireAdminSession(
            context.queryClient,
            location.href,
            async () => snapshot,
          ),
      })
      const child = createRoute({
        getParentRoute: () => parent,
        path: '/admin',
        loader: () => {
          loads++
          return 'private'
        },
      })
      const router = createRouter({
        routeTree: root.addChildren([parent.addChildren([child])]),
        context: { queryClient },
        history: createMemoryHistory({ initialEntries: ['/admin'] }),
      })
      await router.load()
      expect(loads).toBe(name === 'admin' ? 1 : 0)
      queryClient.clear()
    })
  }
  it('preserves denial versus outage and cancels private work before errors', async () => {
    const client = new QueryClient()
    client.setQueryData(['admin', 'private'], 'must disappear')
    await expect(
      requireAdminSession(client, '/admin', async () => {
        throw new AuthDependencyError('network')
      }),
    ).rejects.toBeInstanceOf(AuthDependencyError)
    expect(client.getQueryData(['admin', 'private'])).toBeUndefined()
    await expect(
      requireAdminSession(client, '/admin', async () => ({
        ...admin,
        user: { ...admin.user, role: 'user' },
      })),
    ).rejects.toBeInstanceOf(AdminAccessDeniedError)
    try {
      await requireAdminSession(
        client,
        '//evil.example/admin',
        async () => null,
      )
    } catch (error) {
      expect(isRedirect(error)).toBe(true)
    }
    client.clear()
  })
  it('does not let an in-flight session repopulate the cache after logout', async () => {
    const client = new QueryClient()
    let release: (() => void) | undefined
    const pending = client
      .query({
        queryKey: sessionQueryKey,
        queryFn: async ({ signal }) => {
          void signal
          await new Promise<void>((resolve) => {
            release = resolve
          })
          return admin
        },
      })
      .catch(() => undefined)
    await Bun.sleep(1)
    await clearAdminPrivateQueries(client)
    release?.()
    await pending
    expect(client.getQueryData(sessionQueryKey)).toBeNull()
    client.clear()
  })
  it('clears private data on API401 and keeps 403/outage locked after revalidation failure', async () => {
    const client = new QueryClient()
    for (const status of [401, 403, 503]) {
      client.setQueryData(sessionQueryKey, admin)
      client.setQueryData(['admin', 'private'], 'private')
      const fetcher = privateApiFetcher(client, async () =>
        Response.json({ error: 'safe failure' }, { status }),
      )
      expect(
        (await fetcher('http://api.internal.test/admin/business')).status,
      ).toBe(status)
      expect(client.getQueryData(['admin', 'private'])).toBeUndefined()
      expect(client.getQueryData(sessionQueryKey)).toBeNull()
      if (status !== 401)
        expect(client.getQueryState(sessionQueryKey)?.status).toBe('error')
    }
    client.clear()
  })
})

describe('active admin login redirect', () => {
  it('reuses a fresh snapshot and preserves session/private cache while validating destinations', async () => {
    const client = new QueryClient()
    client.setQueryData(sessionQueryKey, admin)
    client.setQueryData(['admin', 'private'], 'keep')
    for (const [target, destination] of [
      ['/admin?tab=catalog#videos', '/admin?tab=catalog#videos'],
      ['//evil.example/admin', '/admin'],
      ['/admin/login', '/admin'],
    ]) {
      try {
        await redirectActiveAdmin(client, target)
        throw new Error('Expected an admin redirect')
      } catch (error) {
        expect(isRedirect(error)).toBe(true)
        if (!isRedirect(error)) throw error
        expect(error.options.href).toBe(destination)
        expect(error.options.replace).toBe(true)
      }
      expect(
        client.getQueryData<SessionSnapshot | null>(sessionQueryKey),
      ).toEqual(admin)
      expect(client.getQueryData<string>(['admin', 'private'])).toBe('keep')
      expect(client.getQueryState(sessionQueryKey)?.fetchStatus).toBe('idle')
    }
    client.clear()
  })

  for (const [name, snapshot] of [
    ['anonymous', null],
    ['user', { ...admin, user: { ...admin.user, role: 'user' } }],
    ['banned', { ...admin, user: { ...admin.user, banned: true } }],
    [
      'expired',
      { ...admin, session: { expiresAt: new Date(0).toISOString() } },
    ],
  ] as const) {
    it(`keeps login available without clearing the ${name} session`, async () => {
      const client = new QueryClient()
      client.setQueryData(sessionQueryKey, snapshot)
      await redirectActiveAdmin(client, '/admin', async () => snapshot)
      expect(
        client.getQueryData<SessionSnapshot | null>(sessionQueryKey),
      ).toEqual(snapshot)
      client.clear()
    })
  }

  it('does not redirect from stale admin data after a failed check, or swallow unexpected errors', async () => {
    const client = new QueryClient()
    client.setQueryData(sessionQueryKey, admin)
    await redirectActiveAdmin(client, '/admin', async () => {
      throw new AuthDependencyError('network')
    })
    expect(
      client.getQueryData<SessionSnapshot | null>(sessionQueryKey),
    ).toEqual(admin)
    const unexpected = new Error('unexpected')
    await expect(
      redirectActiveAdmin(client, '/admin', async () => {
        throw unexpected
      }),
    ).rejects.toBe(unexpected)
    client.clear()
  })
})
