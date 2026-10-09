import { describe, expect, test } from 'bun:test'

import { createAuthGateway } from '../src/lib/server/auth-gateway'

const apiOrigin = 'http://127.0.0.1:43127'

describe('same-origin auth gateway', () => {
  test('forwards method, path, query, body and approved browser headers', async () => {
    let upstreamRequest: Request | undefined
    const gateway = createAuthGateway('auth', {
      getPublicOrigin: () => 'http://web.example',
      getApiInternalUrl: () => apiOrigin,
      fetcher: async (request) => {
        upstreamRequest = request
        return Response.json({ ok: true })
      },
    })

    const response = await gateway(
      new Request('http://web.example/api/auth/sign-in/email?next=%2Fadmin', {
        method: 'POST',
        headers: {
          cookie: 'better-auth.session_token=opaque',
          origin: 'http://web.example',
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.1',
          'x-private-debug': 'must-not-forward',
        },
        body: JSON.stringify({ email: 'admin@example.com' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(upstreamRequest?.url).toBe(
      `${apiOrigin}/api/auth/sign-in/email?next=%2Fadmin`,
    )
    expect(upstreamRequest?.method).toBe('POST')
    expect(upstreamRequest?.redirect).toBe('manual')
    expect(await upstreamRequest?.text()).toBe(
      JSON.stringify({ email: 'admin@example.com' }),
    )
    expect(upstreamRequest?.headers.get('cookie')).toBe(
      'better-auth.session_token=opaque',
    )
    expect(upstreamRequest?.headers.get('origin')).toBe('http://web.example')
    expect(upstreamRequest?.headers.has('x-forwarded-for')).toBe(false)
    expect(upstreamRequest?.headers.has('x-private-debug')).toBe(false)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  test('keeps status and separate Set-Cookie values while forcing no-store', async () => {
    const headers = new Headers({
      'cache-control': 'public, max-age=3600',
      'content-type': 'application/json',
    })
    headers.append('set-cookie', 'session=one; Path=/; HttpOnly')
    headers.append('set-cookie', 'csrf=two; Path=/; SameSite=Lax')
    const gateway = createAuthGateway('auth', {
      getPublicOrigin: () => 'http://web.example',
      getApiInternalUrl: () => apiOrigin,
      fetcher: async () => new Response('created', { status: 201, headers }),
    })

    const response = await gateway(
      new Request('http://web.example/api/auth/sign-in/email', {
        method: 'POST',
      }),
    )

    expect(response.status).toBe(201)
    expect(response.headers.getSetCookie()).toEqual([
      'session=one; Path=/; HttpOnly',
      'csrf=two; Path=/; SameSite=Lax',
    ])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.text()).toBe('created')
  })

  test('never derives the upstream host from the incoming request', async () => {
    let upstreamUrl = ''
    const gateway = createAuthGateway('auth', {
      getPublicOrigin: () => 'http://web.example',
      getApiInternalUrl: () => apiOrigin,
      fetcher: async (request) => {
        upstreamUrl = request.url
        return new Response(null, { status: 204 })
      },
    })

    await gateway(new Request('https://attacker.example/api/auth/get-session'))
    expect(upstreamUrl).toBe(`${apiOrigin}/api/auth/get-session`)
  })

  test('rejects the removed legacy session endpoint before fetching', async () => {
    let calls = 0
    const gateway = createAuthGateway('auth', {
      getPublicOrigin: () => 'http://web.example',
      getApiInternalUrl: () => apiOrigin,
      fetcher: async () => {
        calls++
        return new Response(null)
      },
    })
    expect(
      (await gateway(new Request('http://web.example/api/admin/session')))
        .status,
    ).toBe(404)
    expect(calls).toBe(0)
  })

  test('rewrites same-upstream redirects to a relative web path and rejects external redirects', async () => {
    const gateway = createAuthGateway('auth', {
      getPublicOrigin: () => 'http://web.example',
      getApiInternalUrl: () => apiOrigin,
      fetcher: async (request) =>
        request.url.includes('?safe')
          ? new Response(null, {
              status: 302,
              headers: { location: `${apiOrigin}/admin?from=auth` },
            })
          : new Response(null, {
              status: 302,
              headers: { location: 'https://attacker.example/collect' },
            }),
    })

    const safeRedirect = await gateway(
      new Request('http://web.example/api/auth/get-session?safe'),
    )
    const externalRedirect = await gateway(
      new Request('http://web.example/api/auth/get-session?external'),
    )

    expect(safeRedirect.status).toBe(302)
    expect(safeRedirect.headers.get('location')).toBe('/admin?from=auth')
    expect(safeRedirect.headers.get('cache-control')).toBe('private, no-store')
    expect(externalRedirect.status).toBe(502)
  })

  test('fails closed for absent or non-origin API_INTERNAL_URL values', async () => {
    let calls = 0
    const fetcher = async () => {
      calls += 1
      return Response.json({ ok: true })
    }

    for (const value of [undefined, 'http://user:secret@attacker.example']) {
      const response = await createAuthGateway('auth', {
        getPublicOrigin: () => 'http://web.example',
        getApiInternalUrl: () => value,
        fetcher,
      })(new Request('http://web.example/api/auth/get-session'))
      expect(response.status).toBe(503)
      expect(await response.text()).not.toContain('secret')
    }
    expect(calls).toBe(0)
  })

  test('rejects oversized request bodies before contacting the API', async () => {
    let calls = 0
    const gateway = createAuthGateway('auth', {
      getPublicOrigin: () => 'http://web.example',
      getApiInternalUrl: () => apiOrigin,
      maxRequestBodyBytes: 8,
      fetcher: async () => {
        calls += 1
        return Response.json({ ok: true })
      },
    })

    const response = await gateway(
      new Request('http://web.example/api/auth/sign-in/email', {
        method: 'POST',
        body: 'body exceeds limit',
      }),
    )

    expect(response.status).toBe(413)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(calls).toBe(0)
  })

  test('returns a generic timeout response when the API does not respond', async () => {
    const gateway = createAuthGateway('auth', {
      getPublicOrigin: () => 'http://web.example',
      getApiInternalUrl: () => apiOrigin,
      timeoutMs: 5,
      fetcher: (request) =>
        new Promise((_, reject) => {
          request.signal.addEventListener(
            'abort',
            () => reject(new Error('transport aborted')),
            { once: true },
          )
        }),
    })

    const response = await gateway(
      new Request('http://web.example/api/auth/get-session'),
    )
    expect(response.status).toBe(504)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.text()).not.toContain('transport aborted')
  })
  test('preserves cookies on public-origin callbacks and blocks operator methods', async () => {
    let calls = 0
    const gateway = createAuthGateway('auth', {
      getApiInternalUrl: () => apiOrigin,
      getPublicOrigin: () => 'http://web.example',
      fetcher: async () => {
        calls++
        return new Response('{}', {
          status: 200,
          headers: {
            location: 'http://web.example/admin',
            'set-cookie': 'session=fixture; HttpOnly; Path=/',
          },
        })
      },
    })
    const response = await gateway(
      new Request('http://web.example/api/auth/sign-in/email', {
        method: 'POST',
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBe('/admin')
    expect(response.headers.getSetCookie()).toHaveLength(1)
    for (const [path, method] of [
      ['/admin/create-user', 'POST'],
      ['/reset-password', 'POST'],
      ['/sign-out', 'DELETE'],
    ])
      expect(
        (
          await gateway(
            new Request('http://web.example/api/auth' + path, { method }),
          )
        ).status,
      ).toBe(404)
    expect(calls).toBe(1)
  })
  test('distinguishes request cancellation and times out a stalled response body', async () => {
    const cancelled = new AbortController()
    cancelled.abort()
    const gateway = createAuthGateway('auth', {
      getApiInternalUrl: () => apiOrigin,
      getPublicOrigin: () => 'http://web.example',
      timeoutMs: 5,
      fetcher: async () => new Response(new ReadableStream({ start() {} })),
    })
    expect(
      (
        await gateway(
          new Request('http://web.example/api/auth/get-session', {
            signal: cancelled.signal,
          }),
        )
      ).status,
    ).toBe(499)
    expect(
      (await gateway(new Request('http://web.example/api/auth/get-session')))
        .status,
    ).toBe(504)
  })
})

test('settings admits only exact GET/PATCH paths and strips public credentials', async () => {
  let calls = 0,
    last: Request | undefined
  const gateway = createAuthGateway('business', {
    getPublicOrigin: () => 'http://web.example',
    getApiInternalUrl: () => apiOrigin,
    fetcher: async (r) => {
      calls++
      last = r
      return Response.json({ ok: true })
    },
  })
  expect(
    (
      await gateway(
        new Request('http://web.example/api/site-settings', {
          headers: { cookie: 'secret', authorization: 'secret' },
        }),
      )
    ).status,
  ).toBe(200)
  expect(last?.headers.has('cookie')).toBe(false)
  expect(last?.headers.has('authorization')).toBe(false)
  for (const path of [
    '/api/site-settings/anything',
    '/api/admin/settings/anything',
    '/api/%73ite-settings',
  ])
    expect(
      (await gateway(new Request('http://web.example' + path))).status,
    ).toBe(404)
  for (const path of ['/api/site-settings', '/api/admin/settings'])
    expect(
      (
        await gateway(
          new Request('http://web.example' + path, { method: 'POST' }),
        )
      ).status,
    ).toBe(405)
  expect(
    (
      await gateway(
        new Request('http://web.example/api/admin/settings', {
          method: 'PATCH',
          headers: { origin: 'http://other.example' },
        }),
      )
    ).status,
  ).toBe(403)
  expect(calls).toBe(1)
  expect(
    (
      await gateway(
        new Request('http://web.example/api/admin/settings?fresh=1', {
          headers: { cookie: 'session' },
        }),
      )
    ).status,
  ).toBe(200)
  expect(last?.headers.get('cookie')).toBe('session')
})
