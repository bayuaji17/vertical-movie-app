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
const api = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: async (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/control') {
      const body = await request.json()
      if (body.role) role = body.role
      if ('outage' in body) outage = body.outage
      return Response.json({ sessionReads })
    }
    if (url.pathname === '/counts') return Response.json({ sessionReads })
    if (url.pathname === '/api/auth/get-session') {
      sessionReads++
      if (outage)
        return Response.json(
          { code: 'DEPENDENCY_UNAVAILABLE' },
          { status: 503 },
        )
      const cookie = request.headers.get('cookie') ?? ''
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
const child = Bun.spawn(['bun', 'run', '--bun', 'vite', 'dev'], {
  cwd: app,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
    VITE_API_URL: url,
    API_INTERNAL_URL: `http://127.0.0.1:${api.port}`,
  },
  stdout: 'ignore',
  stderr: 'ignore',
})
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
  const workerSource = await Bun.file(
    import.meta.dir + '/auth-browser-worker.mjs',
  ).text()
  const workerPath = process.env.AUTH_BROWSER_WORKER_PATH
  assert.ok(
    workerPath,
    'Provide AUTH_BROWSER_WORKER_PATH on a filesystem the runner can read',
  )
  await Bun.write(workerPath, workerSource)
  const nativePath = workerPath.startsWith('/mnt/')
    ? workerPath.replace(
        /^\/mnt\/([a-z])\//,
        (_all, drive) => drive.toUpperCase() + ':/',
      )
    : workerPath
  const worker = Bun.spawn(
    [node, nativePath, url, module, executable, 'http://127.0.0.1:' + api.port],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, stdout, stderr] = await Promise.all([
    worker.exited,
    new Response(worker.stdout).text(),
    new Response(worker.stderr).text(),
  ])
  if (stderr) console.error(stderr)
  if (code && stdout) console.log(stdout.trim())
  assert.equal(code, 0, 'Browser acceptance worker must pass')
  assert.ok(stdout.includes('Browser: SSR1/hydrate0'))
  console.log(stdout.trim())
} finally {
  child.kill()
  await child.exited
  api.stop(true)
}
