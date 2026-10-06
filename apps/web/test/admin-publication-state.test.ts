import type { PublicationSnapshot } from '../src/lib/admin/publication-state'
import type { PublicationClient } from '../src/lib/admin/publication-client'
import { expect, test } from 'bun:test'
import { QueryClient, onlineManager } from '@tanstack/react-query'
import { PublicationController } from '../src/lib/admin/publication-state'
import { PublicationApiError } from '../src/lib/admin/publication-errors'
import {
  invalidatePublication,
  publicationKeys,
  publicationMutationOptions,
} from '../src/lib/admin/publication-queries'
import { contentKeys } from '../src/lib/admin/content-queries'
import { mediaKeys } from '../src/lib/admin/media-queries'
import { inventoryFixture } from './admin-media-fixture'
import { publicationCheckCodes } from '../src/lib/admin/publication-client'

const id = '00000000-0000-4000-8000-000000000001'
function snapshot(
  status: 'draft' | 'published' | 'archived' = 'draft',
  version = 1,
): PublicationSnapshot {
  const now = new Date().toISOString()
  return {
    detail: {
      type: 'film',
      data: {
        id,
        kind: 'movie',
        rowVersion: version,
        publicationStatus: status,
        archivedAt: status === 'archived' ? now : null,
      },
    } as PublicationSnapshot['detail'],
    readiness: {
      videoId: id,
      kind: 'movie',
      rowVersion: version,
      publicationStatus: status,
      archivedAt: status === 'archived' ? now : null,
      canPublish: status === 'draft',
      checks: publicationCheckCodes.map((code) => ({
        code,
        status:
          code === 'ACTIVE_PARENTS'
            ? 'not-applicable'
            : code === 'ACTIVE_DRAFT' && status !== 'draft'
              ? 'blocked'
              : 'passed',
      })),
    },
    media: {
      ...inventoryFixture(),
      rowVersion: version,
      status,
      canPreview: status !== 'archived',
    },
  }
}
function fixture() {
  let current = snapshot()
  let calls = 0
  const keys: string[] = []
  let offline = false,
    busy = false
  let readFailure = false
  let outcome: 'ok' | 'lost-before' | 'lost-after' | 'conflict' | 'old-replay' =
    'ok'
  let invalidations = 0
  const options = {
    id,
    read: async () => {
      if (readFailure) throw Error('network')
      return current
    },
    changed: () => {},
    online: () => !offline,
    uploadBusy: () => busy,
    uuid: () => id,
    invalidate: async () => {
      invalidations++
    },
    client: {
      publish: async (
        _id: string,
        input: { expectedVersion: number; idempotencyKey: string },
      ) => {
        calls++
        keys.push(input.idempotencyKey)
        if (outcome === 'conflict') {
          current = snapshot('draft', 3)
          throw new PublicationApiError(
            409,
            'CONTENT_VERSION_CONFLICT',
            'Private',
          )
        }
        if (outcome === 'lost-before')
          throw new PublicationApiError(0, 'NETWORK_ERROR', 'Private')
        if (outcome !== 'old-replay') current = snapshot('published', 2)
        if (outcome === 'lost-after')
          throw new PublicationApiError(0, 'NETWORK_ERROR', 'Private')
        return {
          id,
          publicationStatus: 'published' as const,
          rowVersion: 2,
          publishedAt: new Date().toISOString(),
          firstPublishedAt: new Date().toISOString(),
        }
      },
      archive: async () => {
        calls++
        if (outcome === 'lost-before')
          throw new PublicationApiError(0, 'NETWORK_ERROR', 'Private')
        current = snapshot('archived', 3)
        if (outcome === 'lost-after')
          throw new PublicationApiError(0, 'NETWORK_ERROR', 'Private')
        return current.detail.data as Awaited<
          ReturnType<PublicationClient['archive']>
        >
      },
    },
  }
  const controller = new PublicationController(options)
  return {
    controller,
    options,
    set: (s: PublicationSnapshot) => {
      current = s
    },
    outcome: (o: typeof outcome) => {
      outcome = o
    },
    offline: (v: boolean) => {
      offline = v
    },
    busy: (v: boolean) => {
      busy = v
    },
    readFailure: (v: boolean) => {
      readFailure = v
    },
    calls: () => calls,
    keys: () => keys,
    invalidations: () => invalidations,
  }
}
test('manual acknowledgement/cancel do not publish; successful intent invalidates and reads current', async () => {
  const f = fixture()
  await f.controller.prepare('publish')
  await f.controller.confirm(false)
  expect(f.calls()).toBe(0)
  f.controller.cancel()
  expect(f.controller.snapshot().phase).toBe('idle')
  await f.controller.prepare('publish')
  await f.controller.confirm(true)
  expect(f.calls()).toBe(1)
  expect(f.controller.snapshot().snapshot?.readiness.publicationStatus).toBe(
    'published',
  )
  expect(f.invalidations()).toBe(1)
})
test('double clicks serialize pending command; late owner/identity cleanup cannot update state', async () => {
  const f = fixture()
  let release!: () => void
  const hold = new Promise<void>((r) => {
    release = r
  })
  const real = f.options.client.publish
  f.options.client.publish = async (...args) => {
    await hold
    return real(...args)
  }
  await f.controller.prepare('publish')
  const first = f.controller.confirm(true)
  await Bun.sleep(1)
  await f.controller.confirm(true)
  expect(f.calls()).toBe(0)
  f.controller.dispose()
  release()
  await first
  expect(f.controller.snapshot().phase).toBe('idle')
  expect(f.invalidations()).toBe(0)
})
test('freshness mismatch forces new review without auto-bumping version', async () => {
  const f = fixture()
  await f.controller.prepare('publish')
  f.set(snapshot('draft', 2))
  await f.controller.confirm(true)
  expect(f.calls()).toBe(0)
  expect(f.controller.snapshot().phase).toBe('conflict')
  await f.controller.prepare('publish')
  const s = snapshot('draft', 2)
  s.media.poster.busy = true
  f.set(s)
  await f.controller.confirm(true)
  expect(f.calls()).toBe(0)
})
test('lost publish response before commit retries only exact key after explicit current-state check', async () => {
  const f = fixture()
  f.outcome('lost-before')
  await f.controller.prepare('publish')
  await f.controller.confirm(true)
  expect(f.controller.snapshot().phase).toBe('retryable')
  expect(f.calls()).toBe(1)
  f.offline(true)
  await f.controller.retry()
  expect(f.calls()).toBe(1)
  f.offline(false)
  expect(f.calls()).toBe(1)
  await f.controller.check()
  f.outcome('ok')
  await f.controller.retry()
  expect(f.calls()).toBe(2)
  expect(f.keys()).toEqual([id, id])
  expect(f.controller.snapshot().phase).toBe('confirmed')
})
test('lost response after commit discovers published without replay', async () => {
  const f = fixture()
  f.outcome('lost-after')
  await f.controller.prepare('publish')
  await f.controller.confirm(true)
  expect(f.calls()).toBe(1)
  expect(f.controller.snapshot().phase).toBe('confirmed')
  await f.controller.retry()
  expect(f.calls()).toBe(1)
})
test('old persisted publish replay never overwrites current archived state', async () => {
  const f = fixture()
  f.outcome('old-replay')
  const publish = f.options.client.publish
  f.options.client.publish = async (...args) => {
    f.set(snapshot('archived', 3))
    return publish(...args)
  }
  await f.controller.prepare('publish')
  await f.controller.confirm(true)
  expect(f.controller.snapshot().snapshot?.readiness.publicationStatus).toBe(
    'archived',
  )
})
test('confirmed POST and failed refetch keep acknowledgement without offering resend', async () => {
  const f = fixture()
  const publish = f.options.client.publish
  f.options.client.publish = async (...args) => {
    const result = await publish(...args)
    f.readFailure(true)
    return result
  }
  await f.controller.prepare('publish')
  await f.controller.confirm(true)
  expect(f.controller.snapshot().phase).toBe('confirmed')
  expect(f.controller.snapshot().refreshUnavailable).toBe(true)
  await f.controller.retry()
  expect(f.calls()).toBe(1)
})
test('archive final state can be confirmed after lost response; changed version requires review', async () => {
  const f = fixture()
  f.set(snapshot('published', 2))
  f.outcome('lost-after')
  await f.controller.prepare('archive')
  await f.controller.confirm()
  expect(f.controller.snapshot().snapshot?.readiness.publicationStatus).toBe(
    'archived',
  )
  expect(f.calls()).toBe(1)
  const g = fixture()
  g.set(snapshot('published', 2))
  g.outcome('lost-before')
  await g.controller.prepare('archive')
  await g.controller.confirm()
  expect(g.controller.snapshot().phase).toBe('retryable')
  g.set(snapshot('published', 4))
  await g.controller.retry()
  expect(g.calls()).toBe(1)
  expect(g.controller.snapshot().phase).toBe('idle')
})
test('local upload interlock and offline never enqueue POST on reconnect', async () => {
  const f = fixture()
  f.busy(true)
  await f.controller.prepare('publish')
  expect(f.calls()).toBe(0)
  expect(f.controller.snapshot().phase).toBe('error')
  f.busy(false)
  f.offline(true)
  await f.controller.prepare('publish')
  f.offline(false)
  expect(f.calls()).toBe(0)
})
test('query invalidation is identity/owner scoped and mutation cannot pause into reconnect queue', async () => {
  const cache = new QueryClient()
  const keys = [
    contentKeys.lists('one'),
    contentKeys.detail('one', 'film', id),
    mediaKeys.owner('one', { ownerType: 'video', ownerId: id }),
    publicationKeys.video('one', id),
  ]
  for (const key of [...keys, publicationKeys.video('two', id)])
    cache.setQueryData(key, { value: 1 })
  await invalidatePublication(cache, 'one', 'film', id)
  for (const key of keys)
    expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
  expect(
    cache.getQueryState(publicationKeys.video('two', id))?.isInvalidated,
  ).toBe(false)
  const options = publicationMutationOptions(undefined, 'one', id)
  expect(options.retry).toBe(false)
  expect(options.networkMode).toBe('always')
  onlineManager.setOnline(true)
  cache.clear()
})

test('known command conflict remains visible after reconciliation and requires a new review', async () => {
  const f = fixture()
  f.outcome('conflict')
  await f.controller.prepare('publish')
  await f.controller.confirm(true)
  expect(f.controller.snapshot().phase).toBe('conflict')
  expect(f.controller.snapshot().message).toContain('changed')
  expect(f.controller.snapshot().snapshot?.readiness.rowVersion).toBe(3)
  await f.controller.retry()
  expect(f.calls()).toBe(1)
  f.outcome('ok')
  await f.controller.prepare('publish')
  expect(f.controller.snapshot().phase).toBe('review')
})
