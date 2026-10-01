import assert from 'node:assert/strict'

const api = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: async (request) => {
    const payload = {
      method: request.method,
      pathname: new URL(request.url).pathname,
      search: new URL(request.url).search,
      cookie: request.headers.get('cookie'),
      origin: request.headers.get('origin'),
      body: await request.text(),
    }
    const headers = new Headers({ 'content-type': 'application/json' })
    headers.append('set-cookie', 'smoke-one=1; Path=/; HttpOnly')
    headers.append('set-cookie', 'smoke-two=2; Path=/; SameSite=Lax')
    return Response.json(payload, { status: 201, headers })
  },
})

async function reservePort() {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => new Response(),
  })
  const port = server.port
  server.stop(true)
  return port
}

async function waitUntilReady(port, child, label) {
  const deadline = Date.now() + 30_000
  let lastError
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${label} exited before it became ready.`)
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`)
      if (response.status < 500) return
    } catch (error) {
      lastError = error
    }
    await Bun.sleep(200)
  }
  throw new Error(`${label} did not become ready: ${String(lastError ?? '')}`)
}

async function verifyGateway(port, label) {
  const response = await fetch(
    `http://127.0.0.1:${port}/api/auth/sign-in/email?from=smoke`,
    {
      method: 'POST',
      headers: {
        cookie: 'smoke-request=cookie',
        origin: `http://127.0.0.1:${port}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: 'admin@example.com' }),
    },
  )
  const payload = await response.json()

  assert.equal(response.status, 201, `${label} preserves upstream status`)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(response.headers.getSetCookie(), [
    'smoke-one=1; Path=/; HttpOnly',
    'smoke-two=2; Path=/; SameSite=Lax',
  ])
  assert.deepEqual(payload, {
    method: 'POST',
    pathname: '/api/auth/sign-in/email',
    search: '?from=smoke',
    cookie: 'smoke-request=cookie',
    origin: `http://127.0.0.1:${port}`,
    body: JSON.stringify({ email: 'admin@example.com' }),
  })

  const methodResponse = await fetch(
    `http://127.0.0.1:${port}/api/auth/sign-out?method=delete`,
    { method: 'DELETE', headers: { origin: `http://127.0.0.1:${port}` } },
  )
  const methodPayload = await methodResponse.json()
  assert.equal(methodResponse.status, 201)
  assert.equal(methodPayload.method, 'DELETE')
  assert.equal(methodPayload.search, '?method=delete')
  const adminResponse = await fetch(
    `http://127.0.0.1:${port}/api/admin/session?from=smoke`,
    { headers: { cookie: 'admin-session=cookie' } },
  )
  const adminPayload = await adminResponse.json()
  assert.equal(adminResponse.status, 201)
  assert.equal(adminPayload.pathname, '/admin/session')
  assert.equal(adminPayload.search, '?from=smoke')
  assert.equal(adminPayload.cookie, 'admin-session=cookie')
  console.log(
    `${label}: status 201, cookies/no-store, POST/DELETE, admin path preserved`,
  )
}

async function runServer(label, command, port) {
  const child = Bun.spawn(command, {
    cwd: import.meta.dir.replace(/\/test$/, ''),
    env: {
      ...process.env,
      NODE_ENV: label === 'built Bun server' ? 'production' : 'development',
      PORT: String(port),
      HOST: '127.0.0.1',
      API_INTERNAL_URL: `http://127.0.0.1:${api.port}`,
    },
    stdout: 'ignore',
    stderr: 'ignore',
  })

  try {
    await waitUntilReady(port, child, label)
    await verifyGateway(port, label)
  } finally {
    child.kill()
    await child.exited
  }
}

try {
  const devPort = await reservePort()
  await runServer(
    'Vite dev server',
    ['bun', 'run', '--bun', 'vite', 'dev'],
    devPort,
  )

  const builtPort = await reservePort()
  await runServer('built Bun server', ['bun', 'run', 'start'], builtPort)
} finally {
  api.stop(true)
}
