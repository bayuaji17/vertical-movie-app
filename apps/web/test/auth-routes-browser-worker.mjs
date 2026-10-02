import assert from 'node:assert/strict'
const [baseURL, moduleURL, executablePath, controlURL] = process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  const control = async (body) =>
    await (
      await fetch(controlURL + '/control', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    ).json()
  const counts = async () => await (await fetch(controlURL + '/counts')).json()
  const hydrate = async (target) =>
    target.waitForFunction(() =>
      Object.keys(document.querySelector('main')).some((key) =>
        key.startsWith('__reactFiber'),
      ),
    )
  const login = async (password = 'BrowserFixture123456') => {
    await page.getByLabel('Email', { exact: true }).fill('browser@example.test')
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  }
  await page.goto(baseURL + '/admin')
  await page.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await hydrate(page)
  assert.ok(page.url().includes('/admin/login'))
  await login('WrongPassword123456')
  await page.getByText('Email atau password tidak cocok.').waitFor()
  await control({ loginLimit: true })
  await login()
  await page
    .getByText(
      'Terlalu banyak percobaan login. Tunggu sebentar, lalu coba lagi.',
    )
    .waitFor()
  await control({ loginLimit: false, role: 'user' })
  await login()
  await page.getByText('Akun ini tidak memiliki akses admin.').waitFor()
  assert.equal(
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    0,
  )
  await control({ role: 'admin' })
  const before = await counts()
  await login()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  const after = await counts()
  assert.equal(
    after.authoritativeReads - before.authoritativeReads,
    1,
    'Login verifies one authoritative session without self-broadcast fetch',
  )
  const cache = await page.evaluate(() =>
    JSON.stringify(
      window.__TSR_ROUTER__.options.context.queryClient.getQueryData([
        'auth',
        'session',
      ]),
    ),
  )
  assert.ok(
    !cache.includes('LOGIN-TOKEN-MUST-NOT-CACHE') &&
      !cache.includes('PRIVATE-BROWSER-TOKEN'),
  )
  await page.reload()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await hydrate(page)
  await control({ logoutFailure: true })
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await page
    .getByText(
      'Layanan autentikasi tidak dapat dihubungi. Sesi belum dapat dipastikan berakhir.',
    )
    .waitFor()
  assert.equal(
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    1,
  )
  await control({ logoutFailure: false, role: 'user' })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page.getByRole('heading', { name: 'Akses admin ditolak' }).waitFor()
  assert.equal(
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    0,
  )
  await control({ role: 'admin' })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  const tab = await context.newPage()
  await tab.goto(baseURL + '/admin')
  await tab.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await hydrate(tab)
  await tab.evaluate(async () => {
    await window.__TSR_ROUTER__.navigate({ to: '/admin/login' })
    await window.__TSR_ROUTER__.navigate({ to: '/admin' })
  })
  await control({ held: true })
  await page.evaluate(() => {
    void window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    })
  })
  await page.waitForFunction(
    () =>
      window.__TSR_ROUTER__.options.context.queryClient.getQueryState([
        'auth',
        'session',
      ]).fetchStatus === 'fetching',
  )
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await page.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await control({ held: false })
  await tab.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await page.waitForTimeout(300)
  assert.equal(
    await page.evaluate(() =>
      window.__TSR_ROUTER__.options.context.queryClient.getQueryData([
        'auth',
        'session',
      ]),
    ),
    null,
    'Delayed query must not restore the admin',
  )
  await tab.goBack()
  await tab.waitForTimeout(200)
  assert.equal(
    await tab.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    0,
  )
  await tab.goto(baseURL + '/admin')
  await tab.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await context.close()
  console.log(
    'Browser: native login wrong/429/non-admin/admin, authoritative1, safe cache, refresh, logout failure, role lock, in-flight logout, cross-tab and back denial passed.',
  )
} finally {
  await browser.close()
}
