import { describe, expect, it } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'

import { clearAdminPrivateQueries } from '../src/lib/auth/session-cache'

import { adminSessionQueryOptions } from '../src/lib/auth/session'
import type { SessionSnapshot } from '@repo/auth/types'

describe('admin session cache cleanup', () => {
  it('removes private auth/admin cache entries while preserving public data', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['auth', 'admin-session'], {
      status: 'authenticated',
    })
    queryClient.setQueryData(['admin', 'videos'], [{ id: 'private-video' }])
    queryClient.setQueryData(['videos', 'published'], [{ id: 'public-video' }])

    await clearAdminPrivateQueries(queryClient)

    expect(queryClient.getQueryData(['auth', 'admin-session'])).toBeUndefined()
    expect(queryClient.getQueryData(['admin', 'videos'])).toBeUndefined()
    expect(queryClient.getQueryData<unknown>(['videos', 'published'])).toEqual([
      { id: 'public-video' },
    ])
    queryClient.clear()
  })
})

describe('one auth snapshot query', () => {
  it('reuses fresh snapshots, deduplicates stale fetches, and clamps freshness to expiry', async () => {
    const queryClient = new QueryClient()
    const fixture: SessionSnapshot = {
      user: {
        id: 'test',
        name: 'Admin',
        email: 'admin@example.test',
        role: 'admin',
        banned: false,
      },
      session: { expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
    }
    let calls = 0
    const options = {
      ...adminSessionQueryOptions(),
      queryFn: async () => {
        calls++
        await Bun.sleep(5)
        return fixture
      },
    }
    await queryClient.query(options)
    for (let i = 0; i < 4; i++) await queryClient.query(options)
    expect(calls).toBe(1)
    const key: readonly unknown[] = options.queryKey
    queryClient.setQueryData(key, fixture, { updatedAt: Date.now() - 61_000 })
    await Promise.all([
      queryClient.query(options),
      queryClient.query(options),
      queryClient.query(options),
    ])
    expect(calls).toBe(2)
    const expired: SessionSnapshot = {
      ...fixture,
      session: { expiresAt: new Date(Date.now() - 1).toISOString() },
    }
    queryClient.setQueryData<SessionSnapshot | null>(key, () => expired)
    await queryClient.query(options)
    expect(calls).toBe(3)
    await expect(
      queryClient.query({
        ...options,
        staleTime: 0,
        queryFn: async () => {
          throw new Error('upstream unavailable')
        },
      }),
    ).rejects.toThrow('upstream unavailable')
    expect(queryClient.getQueryState(key)?.status).toBe('error')
    expect(queryClient.getQueryData<SessionSnapshot | null>(key)).toEqual(
      fixture,
    )
    await queryClient.query(options)
    expect(calls).toBe(4)
    queryClient.clear()
  })
})
