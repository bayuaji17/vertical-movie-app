import { describe, expect, test } from 'bun:test'
import {
  businessRequestTimeoutMs,
  createBusinessGateway,
} from '../src/lib/server/business-gateway'

describe('business gateway timeout policy', () => {
  test('allows 30 seconds only for the exact poster processing POST path', () => {
    const url =
      'http://web.example/api/admin/media/uploads/6f009a09-3d1c-4697-b6d5-3c2ab4c93e4c/process-poster'
    expect(businessRequestTimeoutMs(new Request(url, { method: 'POST' }))).toBe(
      30_000,
    )
    expect(businessRequestTimeoutMs(new Request(url, { method: 'GET' }))).toBe(
      10_000,
    )
    expect(
      businessRequestTimeoutMs(
        new Request(url.replace('/process-poster', '/complete'), {
          method: 'POST',
        }),
      ),
    ).toBe(10_000)
    expect(
      businessRequestTimeoutMs(
        new Request(url.replace('6f009a09', 'not-a-uuid'), {
          method: 'POST',
        }),
      ),
    ).toBe(10_000)
  })

  test('preserves a caller supplied default for every other business request', () => {
    expect(
      businessRequestTimeoutMs(
        new Request('http://web.example/api/admin/videos'),
        250,
      ),
    ).toBe(250)
  })
})
const origin = 'http://web.example',
  id = '10000000-0000-4000-8000-000000000001'
const poster = `/api/catalog/movie/${id}/poster`
function gateway(fetcher: (r: Request) => Promise<Response>, extra = {}) {
  return createBusinessGateway({
    getPublicOrigin: () => origin,
    getApiInternalUrl: () => 'http://127.0.0.1:3001',
    fetcher,
    ...extra,
  })
}
test('public catalog namespace strips credentials and allows only exact GET paths', async () => {
  let calls = 0
  const run = gateway(async (r) => {
    calls++
    expect(r.headers.get('cookie')).toBeNull()
    expect(r.headers.get('authorization')).toBeNull()
    expect(new URL(r.url).pathname.startsWith('/catalog')).toBe(true)
    return Response.json(
      { items: [] },
      { headers: { 'set-cookie': 'private=value' } },
    )
  })
  for (const path of [
    '/api/catalog',
    '/api/catalog/genres',
    '/api/catalog/featured',
  ]) {
    const r = await run(
      new Request(origin + path, {
        headers: { cookie: 'secret=value', authorization: 'Bearer private' },
      }),
    )
    expect(r.status).toBe(200)
    expect(r.headers.get('set-cookie')).toBeNull()
  }
  for (const path of [
    '/api/catalog/admin',
    '/api/catalog/movie/not-uuid/poster',
    '/api/catalog/episode/' + id + '/poster',
    '/api/catalog/genres/extra',
  ])
    expect((await run(new Request(origin + path))).status).toBe(404)
  expect(
    (await run(new Request(origin + '/api/catalog', { method: 'POST' })))
      .status,
  ).toBe(405)
  expect(calls).toBe(3)
})
test('poster-only response limit accepts >1MiB while metadata/private request limits stay bounded', async () => {
  const bytes = new Uint8Array(1_048_577)
  const run = gateway(
    async () =>
      new Response(bytes, {
        headers: {
          'content-type': 'image/webp',
          'cache-control': 'private, no-store',
        },
      }),
  )
  const r = await run(new Request(origin + poster))
  expect(r.status).toBe(200)
  expect((await r.arrayBuffer()).byteLength).toBe(bytes.length)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect((await run(new Request(origin + '/api/catalog'))).status).toBe(502)
  expect(
    (
      await run(
        new Request(origin + '/api/admin/videos', {
          method: 'POST',
          body: bytes,
        }),
      )
    ).status,
  ).toBe(413)
  const large = gateway(
    async () =>
      new Response(new Uint8Array(5_000_001), {
        headers: { 'content-type': 'image/webp' },
      }),
  )
  expect((await large(new Request(origin + poster))).status).toBe(502)
})
test('poster rejects wrong MIME/status/redirect but preserves safe JSON errors and cancels timed-out streams', async () => {
  for (const response of [
    Response.json({ key: 'private' }),
    new Response('', {
      status: 201,
      headers: { 'content-type': 'image/webp' },
    }),
    new Response('', {
      status: 302,
      headers: { location: 'https://private.example/object' },
    }),
  ])
    expect(
      (await gateway(async () => response)(new Request(origin + poster)))
        .status,
    ).toBe(502)
  const safe = await gateway(async () =>
    Response.json({ error: { code: 'CONTENT_NOT_FOUND' } }, { status: 404 }),
  )(new Request(origin + poster))
  expect(safe.status).toBe(404)
  expect(safe.headers.get('content-type')).toContain('application/json')
  let cancelled = false
  const stalled = gateway(
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true
          },
        }),
        { headers: { 'content-type': 'image/webp' } },
      ),
    { timeoutMs: 5 },
  )
  expect((await stalled(new Request(origin + poster))).status).toBe(504)
  expect(cancelled).toBe(true)
})
