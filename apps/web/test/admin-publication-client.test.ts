import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  createPublicationClient,
  publicationCheckCodes,
} from '../src/lib/admin/publication-client'
import {
  PublicationApiError,
  publicationFailure,
} from '../src/lib/admin/publication-errors'

const id = '00000000-0000-4000-8000-000000000001'
const ready = () => ({
  videoId: id,
  kind: 'movie',
  rowVersion: 1,
  publicationStatus: 'draft',
  archivedAt: null,
  canPublish: true,
  checks: publicationCheckCodes.map((code) => ({
    code,
    status: code === 'ACTIVE_PARENTS' ? 'not-applicable' : 'passed',
  })),
})
test('typed private readiness and exact publish/archive bodies use safe transport', async () => {
  const cache = new QueryClient()
  const abort = new AbortController()
  let calls = 0
  const client = createPublicationClient(
    'http://localhost/api',
    cache,
    async (url, init) => {
      const request = new Request(url, init)
      expect(request.credentials).toBe('include')
      expect(request.cache).toBe('no-store')
      expect(init?.signal).toBe(abort.signal)
      calls++
      const path = new URL(request.url).pathname
      if (path.endsWith('/publication-readiness')) return Response.json(ready())
      const body = await request.json()
      if (path.endsWith('/publish')) {
        expect(body).toEqual({ expectedVersion: 1, idempotencyKey: id })
        return Response.json({
          id,
          publicationStatus: 'published',
          rowVersion: 2,
          publishedAt: new Date().toISOString(),
          firstPublishedAt: new Date().toISOString(),
        })
      }
      expect(body).toEqual({ expectedVersion: 2 })
      return Response.json({
        id,
        kind: 'movie',
        publicationStatus: 'archived',
        rowVersion: 3,
        archivedAt: new Date().toISOString(),
        publishedAt: null,
      })
    },
  )
  expect((await client.readiness(id, abort.signal)).canPublish).toBe(true)
  await client.publish(
    id,
    { expectedVersion: 1, idempotencyKey: id },
    abort.signal,
  )
  await client.archive(id, { expectedVersion: 2 }, abort.signal)
  expect(calls).toBe(3)
  cache.clear()
})
test('malformed responses cannot become confirmed publication results', async () => {
  for (const body of [
    {},
    { ...ready(), checks: [] },
    { ...ready(), checks: [...ready().checks.slice(1), ready().checks[1]] },
    { ...ready(), canPublish: false },
    { ...ready(), rowVersion: 0 },
  ]) {
    const cache = new QueryClient()
    const client = createPublicationClient(
      'http://localhost',
      cache,
      async () => Response.json(body),
    )
    await expect(client.readiness(id)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
    cache.clear()
  }
  const cache = new QueryClient()
  const client = createPublicationClient('http://localhost', cache, async () =>
    Response.json({
      id,
      publicationStatus: 'published',
      rowVersion: 2,
      publishedAt: 'private',
      firstPublishedAt: 'invalid',
    }),
  )
  await expect(
    client.publish(id, { expectedVersion: 1, idempotencyKey: id }),
  ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  await expect(
    client.archive(id, { expectedVersion: 2 }),
  ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  cache.clear()
})
test('lost response is unknown, no automatic replay and safe domain messages', async () => {
  const cache = new QueryClient()
  let calls = 0
  const client = createPublicationClient(
    'http://localhost',
    cache,
    async () => {
      calls++
      throw Error('private signed url')
    },
  )
  try {
    await client.publish(id, { expectedVersion: 1, idempotencyKey: id })
  } catch (e) {
    expect(publicationFailure(e).unknown).toBe(true)
    expect(publicationFailure(e).message).not.toContain('private')
  }
  expect(calls).toBe(1)
  expect(
    publicationFailure(
      new PublicationApiError(409, 'CONTENT_VERSION_CONFLICT', 'secret'),
    ).unknown,
  ).toBe(false)
  expect(
    publicationFailure(
      new PublicationApiError(503, 'CONTENT_DEPENDENCY_UNAVAILABLE', 'secret'),
    ).unknown,
  ).toBe(true)
  cache.clear()
})
