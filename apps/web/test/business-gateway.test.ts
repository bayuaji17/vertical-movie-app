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

const cover = (type = 'film') =>
  `${origin}/api/admin/content/${type}/${id}/cover`
test('admin cover thumbnails carry the session, revalidate with ETag and may be cached briefly', async () => {
  const seen: Request[] = []
  const run = gateway(async (r) => {
    seen.push(r)
    return r.headers.get('if-none-match') === '"v1"'
      ? new Response(null, {
          status: 304,
          headers: { etag: '"v1"', 'cache-control': 'private, max-age=300' },
        })
      : new Response(new Uint8Array(4000), {
          headers: {
            'content-type': 'image/webp',
            etag: '"v1"',
            'cache-control': 'private, max-age=300',
          },
        })
  })
  const first = await run(
    new Request(cover(), {
      headers: { cookie: 'better-auth.session_token=x' },
    }),
  )
  expect(first.status).toBe(200)
  expect(first.headers.get('content-type')).toBe('image/webp')
  expect(first.headers.get('etag')).toBe('"v1"')
  expect(first.headers.get('cache-control')).toBe('private, max-age=300')
  expect(seen[0].headers.get('cookie')).toContain('session_token')
  expect(new URL(seen[0].url).pathname).toBe(`/admin/content/film/${id}/cover`)
  const again = await run(
    new Request(cover('series'), {
      headers: {
        cookie: 'better-auth.session_token=x',
        'if-none-match': '"v1"',
      },
    }),
  )
  expect(again.status).toBe(304)
  expect(seen[1].headers.get('if-none-match')).toBe('"v1"')
  expect(again.headers.get('etag')).toBe('"v1"')
  expect(again.headers.get('cache-control')).toBe('private, max-age=300')
})
test('admin cover responses are checked: image only, small, known statuses; other admin routes stay uncached', async () => {
  const ok = {
    'content-type': 'image/webp',
    'cache-control': 'private, max-age=300',
  }
  // Not an image, too large, or an unexpected status is a gateway error.
  expect(
    (await gateway(async () => Response.json({ x: 1 }))(new Request(cover())))
      .status,
  ).toBe(502)
  expect(
    (
      await gateway(
        async () => new Response(new Uint8Array(262_145), { headers: ok }),
      )(new Request(cover()))
    ).status,
  ).toBe(502)
  expect(
    (
      await gateway(async () => new Response('', { status: 201, headers: ok }))(
        new Request(cover()),
      )
    ).status,
  ).toBe(502)
  // A JSON error from the API is passed on and is never cached.
  const denied = await gateway(async () =>
    Response.json(
      { error: { code: 'CONTENT_NOT_FOUND', message: 'x' } },
      { status: 404 },
    ),
  )(new Request(cover()))
  expect(denied.status).toBe(404)
  expect(denied.headers.get('cache-control')).toBe('private, no-store')
  // The cache header is only honoured for the cover route.
  const other = await gateway(async () =>
    Response.json(
      { items: [] },
      { headers: { 'cache-control': 'private, max-age=300' } },
    ),
  )(new Request(`${origin}/api/admin/content?type=film`))
  expect(other.headers.get('cache-control')).toBe('private, no-store')
  // Only the exact GET path with a known type is a cover route.
  let reached = 0
  const strict = gateway(async () => (reached++, new Response('x')))
  for (const bad of [
    `${origin}/api/admin/content/episode/${id}/cover`,
    `${origin}/api/admin/content/film/not-a-uuid/cover`,
  ])
    expect(
      (await strict(new Request(bad))).headers.get('content-type'),
    ).not.toBe('image/webp')
  // A POST to that path is not an image route: no cache header is honoured.
  const post = await gateway(
    async () =>
      new Response('x', {
        headers: { 'cache-control': 'private, max-age=300' },
      }),
  )(new Request(cover(), { method: 'POST', body: 'x' }))
  expect(post.headers.get('cache-control')).toBe('private, no-store')
})
