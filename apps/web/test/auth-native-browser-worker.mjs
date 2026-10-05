import assert from 'node:assert/strict'
const [baseURL, moduleURL, executablePath, apiURL] = process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  const hydrate = (target) =>
    target.waitForFunction(() =>
      Object.keys(document.querySelector('main')).some((key) =>
        key.startsWith('__reactFiber'),
      ),
    )
  const login = async (email, password = 'NativeBrowserFixture123456') => {
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  }
  await page.goto(baseURL + '/admin')
  await page.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await hydrate(page)
  await login('admin@native.example.test', 'WrongPassword123456')
  await page
    .locator('main')
    .getByText('Email atau password tidak cocok.')
    .waitFor()
  await login('user@native.example.test')
  await page
    .locator('main')
    .getByText('Akun ini tidak memiliki akses admin.')
    .waitFor()
  await login('admin@native.example.test')
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  const snapshot = await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.getQueryData([
      'auth',
      'session',
    ]),
  )
  assert.equal(snapshot.user.role, 'admin')
  assert.equal(snapshot.user.email, 'admin@native.example.test')
  assert.deepEqual(Object.keys(snapshot.session), ['expiresAt'])
  assert.deepEqual(Object.keys(snapshot.user).sort(), [
    'banned',
    'email',
    'id',
    'name',
    'role',
  ])
  const cookies = await context.cookies()
  assert.ok(
    cookies.some(
      (cookie) =>
        cookie.name.includes('session_token') &&
        cookie.httpOnly &&
        cookie.sameSite === 'Lax',
    ),
  )
  const counts = async () =>
    (await (await fetch(apiURL + '/counts')).json()).reads
  await page.reload()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await hydrate(page)
  const before = await counts()
  await page.evaluate(async () => {
    const router = window.__TSR_ROUTER__
    await router.navigate({ to: '/admin/login' })
  })
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/admin')
  assert.equal(
    await page.getByRole('heading', { name: 'Masuk ke admin' }).count(),
    0,
  )
  await page.evaluate(async () => {
    const router = window.__TSR_ROUTER__
    await router.preloadRoute({ to: '/admin' })
    await router.navigate({ to: '/admin' })
  })
  assert.equal(
    await counts(),
    before,
    'Fresh native session navigation must add zero reads',
  )
  const sessionCookie = cookies.find((cookie) =>
    cookie.name.includes('session_token'),
  )
  const assertSessionPreserved = async () => {
    const current = (await context.cookies()).find(
      (cookie) => cookie.name === sessionCookie.name,
    )
    assert.equal(
      current?.value,
      sessionCookie.value,
      'Visiting login must preserve the native session token',
    )
    const currentSnapshot = await page.evaluate(() =>
      window.__TSR_ROUTER__.options.context.queryClient.getQueryData([
        'auth',
        'session',
      ]),
    )
    assert.deepEqual(
      currentSnapshot,
      snapshot,
      'The same admin session remains active',
    )
  }
  await assertSessionPreserved()
  await page.goto(baseURL + '/admin/login?redirect=%2Fadmin')
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await hydrate(page)
  assert.equal(new URL(page.url()).pathname, '/admin')
  await assertSessionPreserved()
  await page.reload()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await hydrate(page)
  await assertSessionPreserved()
  await page.goBack()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await hydrate(page)
  await assertSessionPreserved()
  const second = await context.newPage()
  await second.goto(baseURL + '/admin')
  await second
    .getByRole('heading', { name: 'Dashboard', exact: true })
    .waitFor()
  await hydrate(second)
  if (
    !(await page
      .getByRole('button', { name: 'Log out', exact: true })
      .isVisible())
  )
    await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  for (const target of [page, second]) {
    await target.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
    assert.equal(
      await target
        .getByRole('heading', { name: 'Dashboard', exact: true })
        .count(),
      0,
    )
  }
  await page.goBack()
  await page.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await page.goto(baseURL + '/admin')
  await page.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  console.log(
    'Native browser: real Better Auth + PostgreSQL + Elysia + built Bun/Nitro; wrong password/non-admin denied, active-admin login URL redirected on client/direct/refresh/Back with native session token and snapshot preserved, fresh navigation0, logout/cross-tab/Back denial passed.',
  )
} finally {
  await browser.close()
}
