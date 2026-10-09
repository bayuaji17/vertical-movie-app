import { expect, test } from 'bun:test'
import { SettingsServerCache } from '../src/lib/settings/server-cache.server'
import { createAuthGateway } from '../src/lib/server/auth-gateway'
import { defaultSiteSettings, settingsTtlMs } from '../src/lib/settings/model'
import { createPublicSettingsClient } from '../src/lib/settings/client'

const apiOrigin = 'http://api.example',
  webOrigin = 'http://web.example'
const dto = (version = 1, freshForMs = settingsTtlMs) => ({
  item: { ...defaultSiteSettings, siteName: `Site ${version}` },
  version,
  freshForMs,
})
const privateDto = (version = 2) => ({
  item: {
    ...dto(version).item,
    rowVersion: version,
    updatedAt: new Date(0).toISOString(),
  },
  freshForMs: settingsTtlMs,
})
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const request = (path = '/api/site-settings', method = 'GET') =>
  new Request(webOrigin + path, {
    method,
    headers: {
      origin: webOrigin,
      cookie: 'secret-session',
      authorization: 'private',
    },
  })
test('SSR and gateway share one cold fill for100 requests; warm SSR/GET adds zero API calls and no credentials', async () => {
  let calls = 0,
    last: Request | undefined,
    now = 0
  const cache = new SettingsServerCache({
    now: () => now,
    fetcher: async (input, init) => {
      calls++
      last = new Request(input, init)
      now += 100
      return Response.json(dto(1, 600000))
    },
  })
  const gateway = createAuthGateway('business', {
    settingsCache: cache,
    getApiInternalUrl: () => apiOrigin,
    getPublicOrigin: () => webOrigin,
  })
  const values = await Promise.all(
    Array.from({ length: 100 }, (_, i) =>
      i % 2 ? cache.get(apiOrigin) : gateway(request()).then((r) => r.json()),
    ),
  )
  expect(calls).toBe(1)
  expect(values.every((v) => v.version === 1)).toBe(true)
  expect(last?.headers.has('cookie')).toBe(false)
  expect(last?.headers.has('authorization')).toBe(false)
  expect(last?.redirect).toBe('error')
  expect((await cache.get(apiOrigin)).freshForMs).toBe(599900)
  for (let i = 0; i < 10; i++) {
    await cache.get(apiOrigin)
    expect((await gateway(request())).status).toBe(200)
  }
  expect(calls).toBe(1)
  now = 600000
  await Promise.all(Array.from({ length: 100 }, () => cache.get(apiOrigin)))
  expect(calls).toBe(2)
  expect((await gateway(request('/api/site-settings?fresh=1'))).status).toBe(
    422,
  )
  expect(calls).toBe(2)
})
test('Save gateway primes before response with zero refill; old fill and older write never restore old values; fresh reconciliation primes', async () => {
  const hold = deferred<Response>()
  let calls = 0,
    now = 0,
    saveVersion = 3,
    status = 200
  const cache = new SettingsServerCache({
    now: () => now,
    fetcher: async () => {
      calls++
      return hold.promise
    },
  })
  const gateway = createAuthGateway('business', {
    settingsCache: cache,
    now: () => now,
    getApiInternalUrl: () => apiOrigin,
    getPublicOrigin: () => webOrigin,
    fetcher: async () => {
      now += 100
      return Response.json(privateDto(saveVersion), { status })
    },
  })
  const old = cache.get(apiOrigin)
  const saved = await gateway(request('/api/admin/settings', 'PATCH'))
  expect(saved.status).toBe(200)
  expect((await cache.get(apiOrigin)).version).toBe(3)
  expect(calls).toBe(1)
  saveVersion = 2
  await gateway(request('/api/admin/settings', 'PATCH'))
  hold.resolve(Response.json(dto(1)))
  expect((await old).version).toBe(3)
  expect((await cache.get(apiOrigin)).version).toBe(3)
  saveVersion = 4
  await gateway(request('/api/admin/settings?fresh=1'))
  expect((await cache.get(apiOrigin)).version).toBe(4)
  status = 409
  saveVersion = 5
  await gateway(request('/api/admin/settings', 'PATCH'))
  expect((await cache.get(apiOrigin)).version).toBe(4)
})
test('a cancelled page detaches without cancelling the shared fill; origin changes fence old fills', async () => {
  const a = deferred<Response>(),
    b = deferred<Response>(),
    started = deferred<void>()
  let calls = 0,
    sharedSignal: AbortSignal | undefined
  const cache = new SettingsServerCache({
    fetcher: async (_input, init) => {
      sharedSignal = init?.signal ?? undefined
      started.resolve()
      return ++calls === 1 ? a.promise : b.promise
    },
  })
  const c = new AbortController(),
    aborted = cache.get(apiOrigin, c.signal),
    other = cache.get(apiOrigin)
  await started.promise
  c.abort()
  await expect(aborted).rejects.toHaveProperty('name', 'AbortError')
  expect(sharedSignal?.aborted).toBe(false)
  const next = cache.get('http://new-api.example')
  b.resolve(Response.json(dto(8)))
  expect((await next).version).toBe(8)
  a.resolve(Response.json(dto(9)))
  expect((await other).freshForMs).toBe(0)
  expect((await cache.get('http://new-api.example')).version).toBe(8)
})
test('errors and invalid DTOs have five-second cooldown; timeout bounded; remaining ten-second deadline survives transport', async () => {
  let now = 0,
    calls = 0
  const cache = new SettingsServerCache({
    now: () => now,
    fetcher: async () => {
      calls++
      return Response.json({ ...dto(), secret: 'private' })
    },
  })
  for (let i = 0; i < 10; i++)
    await expect(cache.get(apiOrigin)).rejects.toMatchObject({ status: 503 })
  expect(calls).toBe(1)
  now = 5000
  await expect(cache.get(apiOrigin)).rejects.toMatchObject({ status: 503 })
  expect(calls).toBe(2)
  const timeout = new SettingsServerCache({
    timeoutMs: 10,
    fetcher: () => new Promise(() => {}),
  })
  await expect(timeout.get(apiOrigin)).rejects.toMatchObject({ status: 503 })
  const client = createPublicSettingsClient(
    apiOrigin,
    async () => {
      now += 1000
      return Response.json(dto(1, 10000))
    },
    () => now,
  )
  const read = await client.read(new AbortController().signal)
  expect(read.expiresAt - now).toBe(9000)
})
test('unauthorized/invalid writes never prime; ambiguous writes and malformed committed DTO expire without claiming rollback', async () => {
  let publicCalls = 0,
    status = 401,
    invalid = false
  const cache = new SettingsServerCache({
    fetcher: async () => {
      publicCalls++
      return Response.json(dto())
    },
  })
  const gateway = createAuthGateway('business', {
    settingsCache: cache,
    getApiInternalUrl: () => apiOrigin,
    getPublicOrigin: () => webOrigin,
    fetcher: async () =>
      Response.json(invalid ? { invalid: true } : privateDto(), { status }),
  })
  await cache.get(apiOrigin)
  for (const s of [401, 403, 409, 422]) {
    status = s
    expect(
      (await gateway(request('/api/admin/settings', 'PATCH'))).status,
    ).toBe(s)
    await cache.get(apiOrigin)
  }
  expect(publicCalls).toBe(1)
  status = 503
  await gateway(request('/api/admin/settings', 'PATCH'))
  await cache.get(apiOrigin)
  expect(publicCalls).toBe(2)
  status = 200
  invalid = true
  expect((await gateway(request('/api/admin/settings', 'PATCH'))).status).toBe(
    200,
  )
  await cache.get(apiOrigin)
  expect(publicCalls).toBe(3)
  expect((await gateway(request('/api/admin/settings?fresh=1'))).status).toBe(
    200,
  )
})
