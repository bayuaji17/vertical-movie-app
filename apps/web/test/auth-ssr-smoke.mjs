import assert from 'node:assert/strict'
const expiresAt = new Date(Date.now() + 86_400_000).toISOString()
const seen = []
const api = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: async (request) => {
    const url = new URL(request.url)
    assert.equal(url.pathname, '/api/auth/get-session')
    assert.equal(url.searchParams.get('disableCookieCache'), 'true')
    const cookie = request.headers.get('cookie') ?? ''
    seen.push(cookie)
    if (cookie === 'fixture=outage')
      return Response.json({ code: 'private-detail' }, { status: 503 })
    if (cookie === 'fixture=stall') return new Promise(() => {})
    const headers = new Headers()
    headers.append(
      'set-cookie',
      `cache=${cookie.includes('admin') ? 'admin' : 'other'}; HttpOnly; Path=/`,
    )
    headers.append('set-cookie', 'extra=proof; HttpOnly; Path=/')
    return Response.json(
      cookie
        ? {
            user: {
              id: cookie,
              name: 'SSR Admin',
              email: 'ssr@example.test',
              role: cookie === 'fixture=user' ? 'user' : 'admin',
              banned: false,
            },
            session: {
              expiresAt,
              token: 'SSR-TOKEN-MUST-NOT-SERIALIZE',
              ipAddress: 'SSR-IP-MUST-NOT-SERIALIZE',
            },
            account: { password: 'SSR-HASH-MUST-NOT-SERIALIZE' },
          }
        : null,
      { headers },
    )
  },
})
const reserve = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(),
})
const port = reserve.port
reserve.stop(true)
const app = import.meta.dir.replace(/\/test$/, '')
const child = Bun.spawn(['bun', '.output/server/index.mjs'], {
  cwd: app,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
    API_INTERNAL_URL: `http://127.0.0.1:${api.port}`,
    VITE_API_URL: 'http://localhost:3000',
  },
  stdout: 'ignore',
  stderr: 'ignore',
})
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`)
      ready = true
      break
    } catch {
      await Bun.sleep(100)
    }
  }
  assert.ok(ready)
  const load = (cookie) =>
    fetch(`http://127.0.0.1:${port}/admin`, {
      headers: cookie ? { cookie } : {},
      redirect: 'manual',
    })
  const [admin, anonymous, user] = await Promise.all([
    load('fixture=admin'),
    load(),
    load('fixture=user'),
  ])
  assert.equal(admin.status, 200)
  const html = await admin.text()
  assert.match(html, /Dashboard/)
  for (const secret of [
    'SSR-TOKEN-MUST-NOT-SERIALIZE',
    'SSR-IP-MUST-NOT-SERIALIZE',
    'SSR-HASH-MUST-NOT-SERIALIZE',
  ])
    assert.ok(!html.includes(secret))
  assert.match(admin.headers.get('cache-control'), /private.*no-store/)
  assert.deepEqual(admin.headers.getSetCookie(), [
    'cache=admin; HttpOnly; Path=/',
    'extra=proof; HttpOnly; Path=/',
  ])
  assert.ok([302, 307].includes(anonymous.status))
  assert.match(anonymous.headers.get('location'), /admin\/login/)
  assert.equal(user.status, 403)
  assert.ok(!(await user.text()).includes('Sesi admin aktif untuk'))
  const outage = await load('fixture=outage')
  assert.equal(outage.status, 503)
  assert.ok(!(await outage.text()).includes('Sesi admin aktif untuk'))
  assert.ok(!outage.headers.get('location'))
  const loginURL = `http://127.0.0.1:${port}/admin/login?redirect=%2Fadmin%3Ftab%3Dcatalog%23videos`
  const activeLogin = await fetch(loginURL, {
    headers: { cookie: 'fixture=admin' },
    redirect: 'manual',
  })
  assert.ok([302, 307].includes(activeLogin.status))
  assert.equal(activeLogin.headers.get('location'), '/admin?tab=catalog#videos')
  assert.match(activeLogin.headers.get('cache-control'), /private.*no-store/)
  assert.ok(!(await activeLogin.text()).includes('Masuk ke admin'))
  for (const cookie of ['', 'fixture=user', 'fixture=outage']) {
    const login = await fetch(loginURL, {
      headers: cookie ? { cookie } : {},
      redirect: 'manual',
    })
    assert.equal(login.status, 200)
    assert.ok((await login.text()).includes('Masuk ke admin'))
  }
  const start = Date.now()
  const stalled = await load('fixture=stall')
  assert.ok(Date.now() - start < 12_000)
  assert.ok(!(await stalled.text()).includes('Sesi admin aktif untuk'))
  assert.ok(
    seen.includes('fixture=admin') &&
      seen.includes('') &&
      seen.includes('fixture=user'),
  )
  console.log(
    'SSR native: admin/null/user/outage/stall, active-admin login redirect, anonymous/user/outage login availability, isolated cookies, multi Set-Cookie and safe HTML passed.',
  )
} finally {
  child.kill()
  await child.exited
  api.stop(true)
}
