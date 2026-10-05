import assert from 'node:assert/strict'
const [baseURL, moduleURL, executablePath, controlURL] = process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
try {
  const context = await browser.newContext()
  await context.addCookies([
    {
      name: 'browser-fixture',
      value: 'admin',
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const page = await context.newPage()
  await page.clock.install({ time: new Date() })
  await page.goto(baseURL + '/admin')
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await page.waitForFunction(() => !!window.__TSR_ROUTER__)
  await page.clock.runFor(10)
  await page.waitForTimeout(300)
  await page.clock.runFor(10)
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main')).some((key) =>
      key.startsWith('__reactFiber'),
    ),
  )
  const count = async () =>
    (await (await fetch(controlURL + '/counts')).json()).sessionReads
  assert.equal(
    await count(),
    1,
    'SSR plus fresh hydration must read one session',
  )
  for (let i = 0; i < 3; i++) {
    await page.evaluate(async () => {
      await window.__TSR_ROUTER__.navigate({ to: '/admin/login' })
      await window.__TSR_ROUTER__.preloadRoute({ to: '/admin' })
      await window.__TSR_ROUTER__.navigate({ to: '/admin' })
    })
  }
  assert.equal(
    await count(),
    1,
    'Fresh navigation and preload must add zero reads',
  )
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.setQueryData(
      ['auth', 'session'],
      window.__TSR_ROUTER__.options.context.queryClient.getQueryData([
        'auth',
        'session',
      ]),
      { updatedAt: Date.now() - 61_000 },
    ),
  )
  await page.evaluate(async () => {
    const router = window.__TSR_ROUTER__
    await router.navigate({ to: '/admin/login' })
    await Promise.all([
      router.preloadRoute({ to: '/admin' }),
      router.preloadRoute({ to: '/admin' }),
    ])
    await router.navigate({ to: '/admin' })
  })
  assert.equal(
    await count(),
    2,
    'Concurrent stale preload/navigation must deduplicate',
  )
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.setQueryData(
      ['auth', 'session'],
      window.__TSR_ROUTER__.options.context.queryClient.getQueryData([
        'auth',
        'session',
      ]),
      { updatedAt: Date.now() - 61_000 },
    ),
  )
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'))
  })
  await page.clock.runFor(65_000)
  assert.equal(await count(), 2, 'Offline observer must not poll')
  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'))
  })
  await page.clock.runFor(10)
  await page.waitForTimeout(250)
  await page.clock.runFor(10)
  assert.equal(
    await count(),
    3,
    'Reconnect stale observer must revalidate once',
  )
  await page.clock.runFor(61_000)
  await page.waitForTimeout(250)
  await page.clock.runFor(10)
  assert.equal(await count(), 4, 'Visible online observer polls at 60 seconds')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(65_000)
  await page.waitForTimeout(250)
  assert.equal(await count(), 4, 'Hidden tab must not poll')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(10)
  await page.waitForTimeout(250)
  await page.clock.runFor(10)
  assert.equal(await count(), 5, 'Focus stale observer revalidates once')
  await fetch(controlURL + '/control', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ outage: true }),
  })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page.clock.runFor(10)
  await page
    .getByRole('heading', { name: 'Admin session unavailable' })
    .waitFor()
  assert.equal(
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    0,
    'Error with cached data must close private content',
  )
  await fetch(controlURL + '/control', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ outage: false }),
  })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page.clock.runFor(10)
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await page.evaluate(() => {
    const client = window.__TSR_ROUTER__.options.context.queryClient
    const data = client.getQueryData(['auth', 'session'])
    client.setQueryData(['auth', 'session'], {
      ...data,
      session: { expiresAt: new Date(Date.now() + 1000).toISOString() },
    })
  })
  await page.clock.runFor(10)
  await page.clock.runFor(1500)
  assert.equal(
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    0,
    'Idle expiry must close private content',
  )
  console.log(
    'Browser: SSR1/hydrate0, fresh/preload0, stale concurrent1, offline0, reconnect1, poll1, outage lock and idle expiry passed.',
  )
  await context.close()
} finally {
  await browser.close()
}
