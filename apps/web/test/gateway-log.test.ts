import { describe, expect, test } from 'bun:test'
import { createLogger } from '@repo/log'
import { createBusinessGateway } from '../src/lib/server/business-gateway'
import { createAuthGateway } from '../src/lib/server/auth-gateway'

const origin = 'http://web.example'
const id = '3f2b8c1e-0d4a-4b7e-9a51-6c2d7e8f9a10'
function setup(
  fetcher: (r: Request) => Promise<Response>,
  extra: Record<string, unknown> = {},
) {
  const lines: string[] = []
  const log = createLogger('web', {
    config: { level: 'debug', format: 'json', bodies: false },
    write: (line) => void lines.push(line),
  })
  const gateway = createBusinessGateway({
    log,
    getPublicOrigin: () => origin,
    getApiInternalUrl: () => 'http://127.0.0.1:3001',
    fetcher,
    ...extra,
  })
  const records = () =>
    lines.map((l) => JSON.parse(l) as Record<string, unknown>)
  return { gateway, lines, records }
}
const ok = () => Promise.resolve(Response.json({ ok: true }))

describe('gateway request logs and correlation', () => {
  test('forwards one request ID upstream, returns it and logs the same ID', async () => {
    const seen: Request[] = []
    const { gateway, records } = setup((r) => {
      seen.push(r)
      return ok()
    })
    const response = await gateway(
      new Request(`${origin}/api/videos?page=2&token=abc`, {
        headers: { 'x-request-id': id },
      }),
    )
    expect(response.status).toBe(200)
    expect(seen[0].headers.get('x-request-id')).toBe(id)
    expect(response.headers.get('x-request-id')).toBe(id)
    expect(records()).toHaveLength(1)
    expect(records()[0]).toMatchObject({
      level: 'info',
      component: 'web',
      event: 'gateway.request',
      requestId: id,
      target: 'business',
      method: 'GET',
      path: '/api/videos',
      query: { page: '2', token: '[redacted]' },
      status: 200,
      upstreamStatus: 200,
    })
    expect(typeof records()[0].durationMs).toBe('number')
  })

  test('replaces a forged ID and never logs cookies or credentials', async () => {
    const seen: Request[] = []
    const { gateway, lines, records } = setup((r) => {
      seen.push(r)
      return ok()
    })
    const response = await gateway(
      new Request(`${origin}/api/videos`, {
        headers: {
          'x-request-id': 'forged value',
          cookie: 'session=secret-cookie',
          authorization: 'Bearer secret-token',
        },
      }),
    )
    const issued = response.headers.get('x-request-id')!
    expect(issued).toMatch(/^[\da-f-]{36}$/)
    expect(issued).not.toBe('forged value')
    expect(seen[0].headers.get('x-request-id')).toBe(issued)
    expect(records()[0].requestId).toBe(issued)
    expect(lines.join('\n')).not.toMatch(/secret|forged/)
  })

  test('failures are logged with level, status and gateway error code', async () => {
    const down = setup(() => Promise.reject(new Error('refused')))
    const unavailable = await down.gateway(new Request(`${origin}/api/videos`))
    expect(unavailable.status).toBe(503)
    expect(down.records()[0]).toMatchObject({
      level: 'error',
      status: 503,
      errorCode: 'AUTH_GATEWAY_UNAVAILABLE',
    })
    expect(unavailable.headers.get('x-request-id')).toBe(
      down.records()[0].requestId as string,
    )

    const slow = setup(
      (r) =>
        new Promise<Response>((_, reject) =>
          r.signal.addEventListener('abort', () => reject(r.signal.reason)),
        ),
      { timeoutMs: 20 },
    )
    expect(
      (await slow.gateway(new Request(`${origin}/api/videos`))).status,
    ).toBe(504)
    expect(slow.records()[0]).toMatchObject({
      level: 'error',
      status: 504,
      errorCode: 'AUTH_GATEWAY_TIMEOUT',
    })

    const unknown = setup(ok)
    expect(
      (await unknown.gateway(new Request(`${origin}/api/nope`))).status,
    ).toBe(404)
    expect(unknown.records()[0]).toMatchObject({
      level: 'warn',
      status: 404,
      errorCode: 'NOT_FOUND',
    })
    expect(unknown.records()[0].upstreamStatus).toBeUndefined()

    const upstream = setup(() =>
      Promise.resolve(new Response('x', { status: 502 })),
    )
    await upstream.gateway(new Request(`${origin}/api/videos`))
    expect(upstream.records()[0]).toMatchObject({
      level: 'error',
      status: 502,
      upstreamStatus: 502,
    })
  })

  test('a client that goes away is logged as info, not as a server error', async () => {
    const controller = new AbortController()
    const hang = setup(
      (r) =>
        new Promise<Response>((_, reject) =>
          r.signal.addEventListener('abort', () => reject(r.signal.reason)),
        ),
    )
    const pending = hang.gateway(
      new Request(`${origin}/api/videos`, { signal: controller.signal }),
    )
    controller.abort()
    expect((await pending).status).toBe(499)
    expect(hang.records()[0]).toMatchObject({ level: 'info', status: 499 })
  })

  test('the auth gateway is covered too', async () => {
    const lines: string[] = []
    const gateway = createAuthGateway('auth', {
      log: createLogger('web', {
        config: { level: 'debug', format: 'json', bodies: false },
        write: (l) => void lines.push(l),
      }),
      getPublicOrigin: () => origin,
      getApiInternalUrl: () => 'http://127.0.0.1:3001',
      fetcher: ok,
    })
    const response = await gateway(
      new Request(`${origin}/api/auth/get-session`),
    )
    expect(response.headers.get('x-request-id')).toBeTruthy()
    expect(JSON.parse(lines[0])).toMatchObject({
      event: 'gateway.request',
      target: 'auth',
    })
  })
})
