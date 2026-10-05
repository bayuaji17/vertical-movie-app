import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { createMediaClient } from '../src/lib/admin/media-client'
import { MediaApiError, mediaFailure } from '../src/lib/admin/media-errors'
import {
  mediaKeys,
  ownerMediaOptions,
  initiateMediaOptions,
  sessionControlOptions,
  invalidateMedia,
} from '../src/lib/admin/media-queries'
import { clearAdminPrivateQueries } from '../src/lib/auth/session-cache'
import { contentKeys } from '../src/lib/admin/content-queries'

const id = '00000000-0000-4000-8000-000000000001'
const owner = { ownerType: 'video' as const, ownerId: id }
const inventory = {
  ...owner,
  rowVersion: 1,
  canUpload: true,
  canPreview: false,
  source: { current: null, active: null, lastAttempt: null, busy: false },
  poster: { current: null, active: null, lastAttempt: null, busy: false },
  config: {
    source: { maxBytes: '1500000000' },
    poster: { maxBytes: '5000000' },
  },
}
const input = {
  ...owner,
  kind: 'source' as const,
  filename: 'movie.mp4',
  contentType: 'video/mp4',
  sizeBytes: '100',
  idempotencyKey: id,
  expectedSha256: 'a'.repeat(64),
}

test('owner discovery uses the typed private route, credentials, no-store and signal', async () => {
  const cache = new QueryClient(),
    abort = new AbortController()
  const client = createMediaClient(
    'http://localhost/api',
    cache,
    async (url, init) => {
      const request = new Request(url, init)
      expect(new URL(request.url).pathname).toBe(
        `/api/admin/media/owners/video/${id}`,
      )
      expect(request.credentials).toBe('include')
      expect(request.cache).toBe('no-store')
      expect(init?.signal).toBe(abort.signal)
      return Response.json(inventory)
    },
  )
  expect((await client.owner(owner, abort.signal)).rowVersion).toBe(1)
  expect(mediaKeys.owner('one', owner)).not.toEqual(
    mediaKeys.owner('two', owner),
  )
  expect(ownerMediaOptions(client, 'one', owner).retry).toBe(false)
  cache.clear()
})
test('failed controls never become cached success and never retry POST automatically', async () => {
  const cache = new QueryClient()
  let calls = 0
  const client = createMediaClient('http://localhost/api', cache, async () => {
    calls++
    throw new TypeError('signed-private-url')
  })
  const options = initiateMediaOptions(client, 'one', owner)
  expect(options.retry).toBe(false)
  expect(sessionControlOptions(client, 'one', owner).retry).toBe(false)
  const mutation = cache.getMutationCache().build(cache, options)
  await expect(mutation.execute(input)).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
    status: 0,
  })
  expect(calls).toBe(1)
  expect(mutation.state.data).toBeUndefined()
  expect(mediaFailure(mutation.state.error).message).not.toContain(
    'signed-private-url',
  )
  cache.clear()
})
test('401 clears media reads and mutations while preserving public data', async () => {
  const cache = new QueryClient()
  cache.setQueryData(mediaKeys.owner('one', owner), inventory)
  cache.setQueryData(mediaKeys.session('one', owner, 'source', id), { id })
  cache.setQueryData(['public', 'catalog'], { public: true })
  const client = createMediaClient('http://localhost/api', cache, async () =>
    Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 }),
  )
  cache
    .getMutationCache()
    .build(cache, initiateMediaOptions(client, 'one', owner))
  await expect(client.owner(owner)).rejects.toBeInstanceOf(MediaApiError)
  expect(cache.getQueryCache().findAll({ queryKey: ['admin'] })).toHaveLength(0)
  expect(cache.getMutationCache().getAll()).toHaveLength(0)
  expect(
    cache.getQueryData<{ public: boolean }>(['public', 'catalog']),
  ).toEqual({ public: true })
  cache.clear()
})
test('unknown failures and malformed successes stay safe; abort remains cancellation', async () => {
  const cache = new QueryClient()
  const invalid = createMediaClient('http://localhost/api', cache, async () =>
    Response.json({ ...inventory, ownerId: 'another-owner' }),
  )
  await expect(invalid.owner(owner)).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  })
  const aborted = createMediaClient('http://localhost/api', cache, async () => {
    throw new DOMException('stopped', 'AbortError')
  })
  await expect(aborted.owner(owner)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  const failed = createMediaClient('http://localhost/api', cache, async () =>
    Response.json(
      {
        error: {
          code: 'UNRECOGNIZED_VENDOR_ERROR',
          message: 'credentials and private url',
        },
      },
      { status: 409 },
    ),
  )
  try {
    await failed.owner(owner)
  } catch (error) {
    expect(mediaFailure(error).code).toBe('MEDIA_REQUEST_FAILED')
    expect(mediaFailure(error).message).not.toContain('credentials')
  }
  cache.clear()
})
test('signed part authorization is transient and never enters Query or mutation data', async () => {
  const cache = new QueryClient()
  const client = createMediaClient(
    'http://localhost/api',
    cache,
    async (url, init) => {
      expect(new URL(String(url)).pathname).toBe(
        `/api/admin/media/uploads/${id}/parts`,
      )
      expect(JSON.parse(String(init?.body))).toEqual({ partNumber: 2 })
      return Response.json({
        partNumber: 2,
        url: 'http://localhost:9000/test/private?signature=secret',
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        alreadyUploaded: false,
      })
    },
  )
  expect((await client.signPart(id, 2)).partNumber).toBe(2)
  expect(cache.getQueryCache().getAll()).toHaveLength(0)
  expect(cache.getMutationCache().getAll()).toHaveLength(0)
  cache.clear()
})
test('confirmed completion invalidates owner, metadata detail and lists; cleanup includes every key', async () => {
  const cache = new QueryClient(),
    identity = 'one'
  const detail = contentKeys.detail(identity, 'film', id),
    list = contentKeys.list(identity, {
      type: 'film',
      search: '',
      includeArchived: false,
      page: 1,
      pageSize: 10,
    })
  for (const key of [mediaKeys.owner(identity, owner), detail, list])
    cache.setQueryData(key, { rowVersion: 1 })
  await invalidateMedia(cache, identity, owner, 'film')
  for (const key of [mediaKeys.owner(identity, owner), detail, list])
    expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
  await clearAdminPrivateQueries(cache)
  expect(cache.getQueryCache().findAll({ queryKey: ['admin'] })).toHaveLength(0)
  cache.clear()
})
