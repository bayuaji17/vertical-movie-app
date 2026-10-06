import assert from 'node:assert/strict'
const node = process.env.AUTH_BROWSER_NODE
const module = process.env.AUTH_PLAYWRIGHT_MODULE
const executable = process.env.AUTH_BROWSER_EXECUTABLE
assert.ok(
  node && module && executable,
  'Provide AUTH_BROWSER_NODE, AUTH_PLAYWRIGHT_MODULE and AUTH_BROWSER_EXECUTABLE for the installed runner.',
)
let sessionReads = 0
let role = 'admin'
let outage = false
let logoutFailure = false
let loginLimit = false
let held = false
const releases = new Set()
let signInCalls = 0
let authoritativeReads = 0
const includeContent =
  ['all', 'content'].includes(process.env.AUTH_BROWSER_PHASE ?? 'cache') &&
  !!process.env.CONTENT_TEST_DATABASE_URL
const contentFixture = includeContent
  ? await (
      await import('../../api/test/integration/admin-content-fixture')
    ).createAdminContentFixture(async ({ headers }) => {
      if (outage) throw new Error('Fixture auth unavailable')
      return (headers.get('cookie') ?? '').includes('browser-fixture=admin')
        ? {
            user: {
              id: 'browser-admin',
              name: 'Browser Admin',
              email: 'browser@example.test',
              role,
              banned: false,
            },
            session: { expiresAt: new Date(Date.now() + 86400000) },
          }
        : null
    })
  : undefined
const mediaFixture =
  process.env.AUTH_BROWSER_PHASE === 'media'
    ? await (
        await import('../../api/test/integration/admin-media-browser-fixture')
      ).createAdminMediaBrowserFixture(async ({ headers }) => {
        if (outage) throw Error('Fixture auth unavailable')
        return (headers.get('cookie') ?? '').includes('browser-fixture=admin')
          ? {
              user: {
                id: 'browser-admin',
                name: 'Browser Admin',
                email: 'browser@example.test',
                role,
                banned: false,
              },
              session: { expiresAt: new Date(Date.now() + 86400000) },
            }
          : null
      })
    : undefined
if (process.env.AUTH_BROWSER_PHASE === 'content')
  assert.ok(
    contentFixture,
    'CONTENT_TEST_DATABASE_URL is required for the dedicated content browser proof',
  )
const api = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: async (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/control/media' && mediaFixture) {
      await mediaFixture.control(await request.json())
      return Response.json({ ok: true })
    }
    if (url.pathname === '/media-proof' && mediaFixture)
      return Response.json(await mediaFixture.proof())
    if (url.pathname === '/cover-screenshot' && mediaFixture) {
      try {
        const path = await mediaFixture.saveCoverScreenshot(
          url.searchParams.get('name') ?? '',
          new Uint8Array(await request.arrayBuffer()),
        )
        return Response.json({ path })
      } catch {
        return new Response('Invalid screenshot', { status: 400 })
      }
    }
    if (url.pathname === '/control/content' && contentFixture) {
      contentFixture.control(await request.json())
      return Response.json({ ok: true })
    }
    if (url.pathname === '/content-proof' && contentFixture)
      return Response.json({
        ids: contentFixture.ids,
        traces: contentFixture.traces,
      })
    if (url.pathname.startsWith('/admin/') && (mediaFixture || contentFixture))
      return (mediaFixture ?? contentFixture).handle(request)
    if (url.pathname === '/control') {
      const body = await request.json()
      if (body.role) role = body.role
      if ('outage' in body) outage = body.outage
      if ('logoutFailure' in body) logoutFailure = body.logoutFailure
      if ('loginLimit' in body) loginLimit = body.loginLimit
      if ('held' in body) {
        held = body.held
        if (!held) {
          for (const release of releases) release()
          releases.clear()
        }
      }
      return Response.json({ sessionReads, signInCalls, authoritativeReads })
    }
    if (url.pathname === '/counts')
      return Response.json({ sessionReads, signInCalls, authoritativeReads })
    if (url.pathname === '/api/auth/sign-in/email') {
      signInCalls++
      const body = await request.json()
      if (loginLimit)
        return Response.json(
          { code: 'TOO_MANY_REQUESTS', message: 'Try later' },
          { status: 429 },
        )
      if (body.password !== 'BrowserFixture123456')
        return Response.json(
          { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid credentials' },
          { status: 401 },
        )
      return Response.json(
        {
          redirect: false,
          token: 'LOGIN-TOKEN-MUST-NOT-CACHE',
          user: {
            id: 'browser-admin',
            name: 'Browser Admin',
            email: 'browser@example.test',
            role,
          },
        },
        {
          headers: {
            'set-cookie':
              'browser-fixture=admin; Path=/; HttpOnly; SameSite=Lax',
          },
        },
      )
    }
    if (url.pathname === '/api/auth/sign-out') {
      if (logoutFailure)
        return Response.json(
          { code: 'DEPENDENCY_UNAVAILABLE', message: 'Unavailable' },
          { status: 503 },
        )
      return Response.json(
        { success: true },
        {
          headers: {
            'set-cookie':
              'browser-fixture=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
          },
        },
      )
    }
    if (url.pathname === '/api/auth/get-session') {
      sessionReads++
      if (url.searchParams.get('disableCookieCache') === 'true')
        authoritativeReads++
      if (outage)
        return Response.json(
          { code: 'DEPENDENCY_UNAVAILABLE' },
          { status: 503 },
        )
      const cookie = request.headers.get('cookie') ?? ''
      if (held)
        await new Promise((resolve) => {
          releases.add(resolve)
        })
      return Response.json(
        cookie.includes('browser-fixture=admin')
          ? {
              user: {
                id: 'browser-admin',
                name: 'Browser Admin',
                email: 'browser@example.test',
                role,
                banned: false,
              },
              session: {
                expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
                token: 'PRIVATE-BROWSER-TOKEN',
              },
            }
          : null,
      )
    }
    return new Response('Not Found', { status: 404 })
  },
})
const reserve = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(),
})
const port = reserve.port
reserve.stop(true)
const url = `http://127.0.0.1:${port}`
const app = import.meta.dir.replace(/\/test$/, '')
const built = process.env.AUTH_BROWSER_RUNTIME === 'built'
const appEnv = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(port),
  VITE_API_URL: url,
  API_INTERNAL_URL: 'http://127.0.0.1:' + api.port,
}
if (built) {
  const build = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: app,
    env: appEnv,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, out, err] = await Promise.all([
    build.exited,
    new Response(build.stdout).text(),
    new Response(build.stderr).text(),
  ])
  if (code) {
    api.stop(true)
    await contentFixture?.close()
    await mediaFixture?.close()
    throw new Error('Browser fixture build failed: ' + (out + err).slice(-4000))
  }
}
const child = Bun.spawn(
  built
    ? [process.execPath, '.output/server/index.mjs']
    : [process.execPath, 'run', '--bun', 'vite', 'dev'],
  {
    cwd: app,
    env: { ...appEnv, NODE_ENV: built ? 'production' : 'development' },
    stdout: 'ignore',
    stderr: 'ignore',
  },
)

try {
  let ready = false
  for (let i = 0; i < 150; i++) {
    try {
      await fetch(url + '/')
      ready = true
      break
    } catch {
      await Bun.sleep(100)
    }
  }
  assert.ok(ready)
  const phases =
    process.env.AUTH_BROWSER_PHASE === 'all'
      ? ['cache', 'routes', ...(contentFixture ? ['content'] : [])]
      : [process.env.AUTH_BROWSER_PHASE ?? 'cache']
  for (const phase of phases) {
    const workerSource = await Bun.file(
      import.meta.dir +
        (phase === 'media'
          ? '/admin-media-upload-browser-worker.mjs'
          : phase === 'content'
            ? '/admin-content-browser-worker.mjs'
            : phase === 'routes'
              ? '/auth-routes-browser-worker.mjs'
              : '/auth-browser-worker.mjs'),
    ).text()
    const workerPath = process.env.AUTH_BROWSER_WORKER_PATH
    if (workerPath) await Bun.write(workerPath, workerSource)
    const nativePath = workerPath?.startsWith('/mnt/')
      ? workerPath.replace(
          /^\/mnt\/([a-z])\//,
          (_all, drive) => drive.toUpperCase() + ':/',
        )
      : workerPath
    const worker = Bun.spawn(
      [
        node,
        ...(nativePath
          ? [nativePath]
          : [
              '--input-type=module',
              '--eval',
              `process.argv.splice(1,0,'browser-worker.mjs');\n${workerSource}`,
            ]),
        url,
        module,
        executable,
        'http://127.0.0.1:' + api.port,
        process.env.ADMIN_BROWSER_SCREENSHOT_PREFIX ?? '',
        process.env.MEDIA_BROWSER_PHASE ?? 'full',
      ],
      {
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          MEDIA_BROWSER_PHASE: process.env.MEDIA_BROWSER_PHASE ?? 'full',
        },
      },
    )
    const [code, stdout, stderr] = await Promise.all([
      worker.exited,
      new Response(worker.stdout).text(),
      new Response(worker.stderr).text(),
    ])
    if (stderr) console.error(stderr)
    if (code && stdout) console.log(stdout.trim())
    assert.equal(code, 0, 'Browser acceptance worker must pass')
    assert.ok(stdout.includes('Browser:'))
    console.log((built ? 'Built Bun/Nitro ' : 'Vite ') + stdout.trim())
  }
} finally {
  child.kill()
  await child.exited
  api.stop(true)
  await contentFixture?.close()
  await mediaFixture?.close()
}
