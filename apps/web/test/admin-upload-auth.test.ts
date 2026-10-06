import { expect, test } from 'bun:test'
import { QueryClient, onlineManager } from '@tanstack/react-query'
import {
  registerPrivateEffect,
  stopAdminPrivateEffects,
} from '../src/lib/auth/private-effects'
import {
  clearAdminPrivateQueries,
  clearAdminDataQueries,
  sessionQueryKey,
} from '../src/lib/auth/session-cache'
import { recheckAdminSession } from '../src/lib/auth/transitions'
import type { SessionSnapshot } from '@repo/auth/types'
import {
  UploadCoordinator,
  UploadManager,
} from '../src/lib/admin/upload-manager'
import {
  registerUploadManager,
  hasWorkingUploads,
} from '../src/lib/admin/upload-session-registry'
import type { MediaClient } from '../src/lib/admin/media-client'
import { inventoryFixture } from './admin-media-fixture'
import { initiateMediaOptions } from '../src/lib/admin/media-queries'

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
test('offline control mutations remain abortable instead of retaining a paused operation', async () => {
  const cache = new QueryClient(),
    controller = new AbortController(),
    wasOnline = onlineManager.isOnline()
  let started = false
  onlineManager.setOnline(false)
  try {
    const inventory = inventoryFixture(),
      client = {
        initiate: async () => {
          throw Error('overridden')
        },
      } as unknown as MediaClient
    const operation = cache.getMutationCache().build(cache, {
      ...initiateMediaOptions(client, 'admin', inventory),
      mutationFn: () =>
        new Promise<Awaited<ReturnType<MediaClient['initiate']>>>(
          (_resolve, reject) => {
            started = true
            controller.signal.addEventListener(
              'abort',
              () => reject(new DOMException('stopped', 'AbortError')),
              { once: true },
            )
          },
        ),
    })
    const pending = operation.execute({
      ownerType: 'video',
      ownerId: inventory.ownerId,
      kind: 'source',
      filename: 'video.mp4',
      contentType: 'video/mp4',
      sizeBytes: '3',
      idempotencyKey: crypto.randomUUID(),
      expectedSha256: 'a'.repeat(64),
    })
    await Bun.sleep(1)
    expect(started).toBe(true)
    expect(operation.state.isPaused).toBe(false)
    controller.abort()
    await expect(pending).rejects.toHaveProperty('name', 'AbortError')
  } finally {
    onlineManager.setOnline(wasOnline)
    cache.clear()
  }
})
test('private effects stop synchronously before cache cleanup and preserve public data', async () => {
  for (const clear of [clearAdminPrivateQueries, clearAdminDataQueries]) {
    const cache = new QueryClient()
    let stopped = 0
    const unregister = registerPrivateEffect(cache, () => stopped++)
    cache.setQueryData(['admin', 'media'], 'private')
    cache.setQueryData(['public'], 'keep')
    const pending = clear(cache)
    expect(stopped).toBe(1)
    await pending
    expect(cache.getQueryData(['admin', 'media'])).toBeUndefined()
    expect(cache.getQueryData<string>(['public'])).toBe('keep')
    unregister()
    stopAdminPrivateEffects(cache)
    expect(stopped).toBe(1)
    cache.clear()
  }
})
test('a valid business outage recheck preserves attempts; revoked/failed auth stops them', async () => {
  const cache = new QueryClient()
  cache.setQueryData(sessionQueryKey, admin)
  let stopped = 0
  const unregister = registerPrivateEffect(cache, () => stopped++)
  await recheckAdminSession(cache, async () => admin)
  expect(stopped).toBe(0)
  await recheckAdminSession(cache, async () => null)
  expect(stopped).toBe(1)
  await recheckAdminSession(cache, async () => {
    throw Error('auth outage')
  }).catch(() => {})
  expect(stopped).toBe(2)
  unregister()
  cache.clear()
})
test('auth stop aborts active hashing, drops selected file, unregisters private manager and suppresses late initiation', async () => {
  const cache = new QueryClient()
  let release!: (digest: string) => void,
    started!: () => void,
    initiations = 0
  const begun = new Promise<void>((r) => (started = r)),
    hash = new Promise<string>((r) => (release = r))
  const client = {
    initiate: async () => {
      initiations++
      throw Error('must not start')
    },
  } as unknown as MediaClient
  const manager = new UploadManager({
    client,
    coordinator: new UploadCoordinator(),
    changed: () => {},
    committed: async () => {},
    hash: async () => {
      started()
      return hash
    },
    lock: async (_name, op) => op(),
  })
  manager.observe(inventoryFixture())
  manager.select(
    'source',
    new File(['abc'], 'video.mp4', { type: 'video/mp4' }),
  )
  const unregister = registerUploadManager(cache, manager),
    cleanup = registerPrivateEffect(cache, () => manager.pause(undefined, true))
  const pending = manager.start('source')
  await begun
  expect(hasWorkingUploads(cache)).toBe(true)
  stopAdminPrivateEffects(cache)
  expect(hasWorkingUploads(cache)).toBe(false)
  expect(manager.canStart('source')).toBe(false)
  release('a'.repeat(64))
  await pending
  expect(initiations).toBe(0)
  cleanup()
  unregister()
  manager.dispose()
  cache.clear()
})
