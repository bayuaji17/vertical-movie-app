import { expect, test } from 'bun:test'
import { createAuthGateway } from '../src/lib/server/auth-gateway'

test('public content gateway forwards only canonical GETs without browser credentials', async () => {
  const reads: Request[] = []
  const gateway = createAuthGateway('business', {
    getPublicOrigin: () => 'http://web.example',
    getApiInternalUrl: () => 'http://127.0.0.1:43127',
    fetcher: async (request) => {
      reads.push(request)
      return Response.json({ ok: true })
    },
  })
  for (const path of [
    '/catalog/details/movie/a-film',
    '/catalog/details/standalone/a-film',
    '/catalog/details/series/a-series',
    '/catalog/series/a-series/episodes?limit=20&cursor=opaque',
    '/catalog/watch/episode-one',
    '/videos?kinds=movie,standalone&limit=20',
    '/videos/a-film',
    '/videos/a-film/poster',
  ]) {
    const response = await gateway(
      new Request('http://web.example/api' + path, {
        headers: { cookie: 'session=private', authorization: 'Bearer private' },
      }),
    )
    expect(response.status).toBe(200)
    expect(reads.at(-1)?.url).toBe('http://127.0.0.1:43127' + path)
    expect(reads.at(-1)?.headers.has('cookie')).toBe(false)
    expect(reads.at(-1)?.headers.has('authorization')).toBe(false)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  }
  const count = reads.length
  for (const path of [
    '/catalog/details/episode/a-film',
    '/catalog/watch/Bad',
    '/catalog/watch/a%2Ffilm',
    '/catalog/watch/a-film/private',
  ])
    expect(
      (await gateway(new Request('http://web.example/api' + path))).status,
    ).toBe(404)
  expect(
    (
      await gateway(
        new Request('http://web.example/api/catalog/watch/a-film', {
          method: 'POST',
        }),
      )
    ).status,
  ).toBe(405)
  expect(reads.length).toBe(count)
})
