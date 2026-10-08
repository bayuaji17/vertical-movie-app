import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  createPublicationClient,
  publicationCheckCodes,
  seriesPublicationCheckCodes,
} from '../src/lib/admin/publication-client'
import {
  PublicationController,
  snapshotMatches,
} from '../src/lib/admin/publication-state'
import type { PublicationSnapshot } from '../src/lib/admin/publication-state'
import { PublicationApiError } from '../src/lib/admin/publication-errors'
import {
  ownerPublicationMutationOptions,
  invalidateOwnerPublication,
} from '../src/lib/admin/owner-publication-queries'
import { publicationKeys } from '../src/lib/admin/publication-queries'
import { seriesKeys } from '../src/lib/admin/series-queries'
import { inventoryFixture } from './admin-media-fixture'

const id = '00000000-0000-4000-8000-000000000001',
  identity = 'owner-admin'
const readiness = {
  seriesId: id,
  ownerType: 'series',
  rowVersion: 1,
  publicationStatus: 'draft',
  archivedAt: null,
  canPublish: true,
  checks: seriesPublicationCheckCodes.map((code) => ({
    code,
    status: 'passed',
  })),
}
function snapshot(
  status: 'draft' | 'published' = 'draft',
  version = 1,
): PublicationSnapshot {
  return {
    detail: {
      type: 'series',
      data: {
        id,
        title: 'Series',
        rowVersion: version,
        publicationStatus: status,
        archivedAt: null,
      },
    } as PublicationSnapshot['detail'],
    readiness: {
      ...readiness,
      rowVersion: version,
      publicationStatus: status,
      canPublish: status === 'draft',
      checks: readiness.checks.map((c) => ({
        ...c,
        status:
          c.code === 'ACTIVE_DRAFT' && status !== 'draft'
            ? 'blocked'
            : 'passed',
      })),
    } as PublicationSnapshot['readiness'],
    media: {
      ...inventoryFixture(),
      ownerType: 'series',
      ownerId: id,
      status,
      rowVersion: version,
      source: null,
      canPreview: false,
    },
  }
}
test('Series transport confirms owner and six check consistency and preserves typed publish body', async () => {
  const requests: Request[] = [],
    cache = new QueryClient(),
    signal = new AbortController().signal
  const api = createPublicationClient(
    'http://localhost/api',
    cache,
    async (url, init) => {
      const req = new Request(url, init)
      requests.push(req)
      expect(req.credentials).toBe('include')
      expect(req.cache).toBe('no-store')
      expect(init?.signal).toBe(signal)
      return Response.json(
        req.method === 'GET'
          ? readiness
          : {
              id,
              publicationStatus: 'published',
              rowVersion: 2,
              publishedAt: new Date().toISOString(),
              firstPublishedAt: new Date().toISOString(),
            },
      )
    },
  )
  expect((await api.seriesReadiness(id, signal)).canPublish).toBe(true)
  await api.publishSeries(
    id,
    { expectedVersion: 1, idempotencyKey: id },
    signal,
  )
  expect(new URL(requests[0].url).pathname).toBe(
    '/api/admin/series/' + id + '/publication-readiness',
  )
  expect(await requests[1].json()).toEqual({
    expectedVersion: 1,
    idempotencyKey: id,
  })
  for (const dto of [
    { ...readiness, ownerType: 'video' },
    { ...readiness, seriesId: 'wrong' },
    { ...readiness, checks: readiness.checks.slice(1) },
    { ...readiness, canPublish: false },
    { ...readiness, publicationStatus: 'published' },
  ]) {
    const malformed = createPublicationClient(
      'http://localhost',
      cache,
      async () => Response.json(dto),
    )
    await expect(malformed.seriesReadiness(id)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  }
  const options = ownerPublicationMutationOptions(api, identity, {
    type: 'series',
    id,
  })
  expect(options.retry).toBe(false)
  await expect(
    options.mutationFn!({ action: 'archive', expectedVersion: 1 }, {} as never),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_COMMAND' })
  expect(requests).toHaveLength(2)
  cache.clear()
})
test('Series uncertainty keeps one intent key/version, blocks archive and reconciles current state', async () => {
  let current = snapshot(),
    outcome = 'lost-before',
    calls = 0
  const bodies: Array<{ expectedVersion: number; idempotencyKey: string }> = []
  const controller = new PublicationController({
    id,
    read: async () => current,
    changed: () => {},
    online: () => true,
    uploadBusy: () => false,
    invalidate: async () => {},
    uuid: () => id,
    client: {
      publish: async (_id, input) => {
        calls++
        bodies.push(input)
        if (outcome === 'lost-before')
          throw new PublicationApiError(0, 'NETWORK_ERROR', 'Lost')
        current = snapshot('published', 2)
        throw new PublicationApiError(
          0,
          'NETWORK_ERROR',
          'Committed response lost',
        )
      },
      archive: async () => {
        throw Error('Archive must not send')
      },
    },
  })
  expect(snapshotMatches(current, id)).toBe(true)
  await controller.prepare('archive')
  expect(controller.snapshot().phase).toBe('conflict')
  expect(calls).toBe(0)
  controller.cancel()
  await controller.prepare('publish')
  await controller.confirm(true)
  expect(controller.snapshot().phase).toBe('retryable')
  expect(calls).toBe(1)
  outcome = 'lost-after'
  await controller.retry()
  expect(calls).toBe(2)
  expect(bodies[0]).toEqual(bodies[1])
  expect(controller.snapshot().phase).toBe('confirmed')
  controller.dispose()
})
test('owner invalidation reaches Episode and parent Series readiness while preserving other identity and public cache', async () => {
  const cache = new QueryClient(),
    other = '00000000-0000-4000-8000-000000000002',
    keys = [
      publicationKeys.video(identity, other),
      publicationKeys.series(identity, id),
      seriesKeys.episode(identity, id, other),
    ],
    untouched = [
      publicationKeys.series('other', id),
      publicationKeys.series(identity, other),
      ['public', 'catalog'],
    ]
  for (const key of [...keys, ...untouched])
    cache.setQueryData(key, { value: true })
  await invalidateOwnerPublication(cache, identity, {
    type: 'episode',
    id: other,
    seriesId: id,
  })
  for (const key of keys)
    expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
  for (const key of untouched)
    expect(cache.getQueryState(key)?.isInvalidated).toBe(false)
  cache.clear()
})

test('Episode archive checks parent readiness before preparing a command', async () => {
  const base = snapshot('published', 2)
  const current: PublicationSnapshot = {
    ...base,
    detail: {
      type: 'episode',
      data: {
        id,
        kind: 'episode',
        rowVersion: 2,
        publicationStatus: 'published',
        archivedAt: null,
      },
    } as PublicationSnapshot['detail'],
    readiness: {
      videoId: id,
      kind: 'episode',
      rowVersion: 2,
      publicationStatus: 'published',
      archivedAt: null,
      canPublish: false,
      checks: publicationCheckCodes.map((code) => ({
        code,
        status:
          code === 'ACTIVE_DRAFT' || code === 'ACTIVE_PARENTS'
            ? 'blocked'
            : 'passed',
      })),
    },
    media: { ...base.media, ownerType: 'video', canPreview: true },
  }
  let calls = 0
  const controller = new PublicationController({
    id,
    read: async () => current,
    changed: () => {},
    online: () => true,
    uploadBusy: () => false,
    invalidate: async () => {},
    client: {
      publish: async () => {
        calls++
        throw Error('Unexpected')
      },
      archive: async () => {
        calls++
        throw Error('Unexpected')
      },
    },
  })
  await controller.prepare('archive')
  expect(controller.snapshot().phase).toBe('conflict')
  expect(calls).toBe(0)
  controller.dispose()
})
