import { test, expect } from 'bun:test'
import { createBusinessGateway } from '../src/lib/server/business-gateway'

test('business gateway strips exactly one api prefix, preserves playlists and scopes cookies per request', async () => {
  const requests: Request[] = []
  const gateway = createBusinessGateway({
    getApiInternalUrl: () => 'http://127.0.0.1:3001',
    getPublicOrigin: () => 'http://localhost:3000',
    fetcher: async (request) => {
      requests.push(request)
      return new Response('#EXTM3U', {
        headers: {
          'content-type': 'application/vnd.apple.mpegurl',
          'cache-control': 'private, no-store',
        },
      })
    },
  })
  const [publicResponse, privateResponse] = await Promise.all([
    gateway(
      new Request(
        'http://localhost:3000/api/playback/videos/movie/master.m3u8',
        { headers: { cookie: 'visitor-cookie' } },
      ),
    ),
    gateway(
      new Request('http://localhost:3000/api/admin/videos/test/playback', {
        headers: { cookie: 'admin-cookie' },
      }),
    ),
  ])
  expect(
    requests
      .find((r) => r.url.includes('/playback/videos/'))
      ?.headers.has('cookie'),
  ).toBe(false)
  expect(
    requests.find((r) => r.url.includes('/admin/'))?.headers.get('cookie'),
  ).toBe('admin-cookie')
  expect(requests[0].url).not.toContain('/api/playback')
  expect(publicResponse.headers.get('content-type')).toBe(
    'application/vnd.apple.mpegurl',
  )
  expect(privateResponse.headers.get('cache-control')).toBe('private, no-store')
})
test('gateway rejects unrelated paths, forged upstream and cross-origin writes before transport', async () => {
  let calls = 0
  const gateway = createBusinessGateway({
    getApiInternalUrl: () => 'http://127.0.0.1:3001',
    getPublicOrigin: () => 'http://localhost:3000',
    fetcher: async () => {
      calls++
      return Response.json({})
    },
  })
  for (const path of [
    '/api/auth/sign-in/email',
    '/api/https://attacker.invalid',
    '/api/sources/file',
    '/api/outputs/file',
  ])
    expect(
      (await gateway(new Request('http://localhost:3000' + path))).status,
    ).toBe(404)
  expect(
    (
      await gateway(
        new Request('http://localhost:3000/api/admin/media/uploads', {
          method: 'POST',
          headers: { origin: 'http://attacker.invalid' },
        }),
      )
    ).status,
  ).toBe(403)
  expect(calls).toBe(0)
})
