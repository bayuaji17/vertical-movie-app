import assert from 'node:assert/strict'

// Built Nitro server proof; upstream DTO/auth/catalog are controlled fixtures.
for (const available of [true, false]) {
  let reads = 0
  const api = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === '/site-settings') {
        reads++
        assert.equal(request.headers.get('cookie'), null)
        assert.equal(request.headers.get('authorization'), null)
        return available
          ? Response.json({
              item: {
                siteName: 'SSR Brand',
                tagline: 'SSR Tagline',
                description: 'SSR Description',
                footerText: 'SSR Footer',
              },
              version: 1,
              freshForMs: 3600000,
            })
          : Response.json(
              {
                error: {
                  code: 'SETTINGS_UNAVAILABLE',
                  message: 'Fixture unavailable',
                },
              },
              { status: 503 },
            )
      }
      if (url.pathname === '/videos')
        return Response.json({ items: [], nextCursor: null })
      if (url.pathname === '/api/auth/get-session') return Response.json(null)
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
  const base = `http://127.0.0.1:${port}`
  const child = Bun.spawn([process.execPath, '.output/server/index.mjs'], {
    cwd: import.meta.dir.replace(/\/test$/, ''),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      API_INTERNAL_URL: `http://127.0.0.1:${api.port}`,
      VITE_API_URL: base,
    },
    stdout: 'ignore',
    stderr: 'ignore',
  })
  try {
    let ready = false
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + '/admin/login')).status === 200) {
          ready = true
          break
        }
      } catch {}
      await Bun.sleep(100)
    }
    assert.ok(ready)
    for (let i = 0; i < 10; i++) {
      const response = await fetch(base + '/', {
        headers: { cookie: 'secret-session', authorization: 'secret-token' },
      })
      assert.equal(response.status, 200)
      const html = await response.text()
      assert.match(
        html,
        available
          ? /<title>SSR Brand — SSR Tagline<\/title>/
          : /<title>Vertical Movie/,
      )
      assert.ok(
        !html.includes('secret-session') && !html.includes('secret-token'),
      )
      assert.ok(!html.includes('TanStack Start Starter'))
      assert.match(response.headers.get('cache-control'), /no-store/)
      if (available) assert.match(html, /<footer[\s\S]*?SSR Footer<\/p>/)
    }
    if (available) {
      for (let i = 0; i < 10; i++)
        assert.equal((await fetch(base + '/api/site-settings')).status, 200)
      assert.equal(reads, 1)
    } else {
      assert.equal((await fetch(base + '/api/site-settings')).status, 503)
    }
    for (const path of [
      '/videos/missing',
      '/watch/missing',
      '/titles/movie/missing',
      '/series/missing',
    ])
      assert.equal((await fetch(base + path)).status, 404, path)
    assert.equal((await fetch(base + '/admin/login')).status, 200)
    assert.equal(
      (await fetch(base + '/admin/settings', { redirect: 'manual' })).status,
      307,
    )
    console.log(
      `Built settings SSR: ${available ? '10 pages +10 gateway reads share one API read' : 'settings503 uses fallback without blocking catalog/login/watch or changing content404/admin redirect'}; public hydration contains no request credentials.`,
    )
  } finally {
    child.kill()
    await child.exited
    api.stop(true)
  }
}
