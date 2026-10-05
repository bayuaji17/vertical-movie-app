import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import type { SessionSnapshot } from '@repo/auth/types'
import { recheckAdminSession } from '../src/lib/auth/transitions'
import { sessionQueryKey } from '../src/lib/auth/session-cache'

const admin: SessionSnapshot = {
  user: {
    id: 'admin',
    name: 'Admin',
    email: 'admin@example.test',
    role: 'admin',
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
}
test('business failure recheck preserves an authorized snapshot and data until verdict', async () => {
  const cache = new QueryClient()
  cache.setQueryData(sessionQueryKey, admin)
  cache.setQueryData(['admin', 'draft'], 'baseline')
  let release!: () => void
  const pending = recheckAdminSession(cache, async (options) => {
    expect(options.authoritative).toBe(true)
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return admin
  })
  expect(cache.getQueryData<SessionSnapshot | null>(sessionQueryKey)).toEqual(
    admin,
  )
  expect(cache.getQueryData<string>(['admin', 'draft'])).toBe('baseline')
  release()
  await pending
  expect(cache.getQueryData<string>(['admin', 'draft'])).toBe('baseline')
  cache.clear()
})
test('null, revoked role and dependency failure clear private data and retain an authoritative lock', async () => {
  for (const value of [
    null,
    { ...admin, user: { ...admin.user, role: 'user' } },
    new Error('unavailable'),
  ]) {
    const cache = new QueryClient()
    cache.setQueryData(sessionQueryKey, admin)
    cache.setQueryData(['admin', 'draft'], 'private')
    cache.setQueryData(['public'], 'keep')
    await recheckAdminSession(cache, async () => {
      if (value instanceof Error) throw value
      return value
    }).catch(() => undefined)
    expect(cache.getQueryData<string>(['admin', 'draft'])).toBeUndefined()
    expect(cache.getQueryData<string>(['public'])).toBe('keep')
    if (value instanceof Error)
      expect(cache.getQueryState(sessionQueryKey)?.status).toBe('error')
    else
      expect(
        cache.getQueryData<SessionSnapshot | null>(sessionQueryKey),
      ).toEqual(value)
    cache.clear()
  }
})
