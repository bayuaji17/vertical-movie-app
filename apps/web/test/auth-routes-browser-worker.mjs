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
  const withLoadingToast = async (path, title, action) => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    let completion
    const handler = async (route) => {
      completion = (async () => {
        await gate
        await route.continue()
      })()
      await completion
    }
    await page.route('**' + path, handler)
    try {
      await action()
      const entry = page.locator('[data-slot="toast"]').filter({
        has: page.getByText(title, { exact: true }),
      })
      await entry.waitFor({ state: 'visible' })
      return await entry.elementHandle()
    } finally {
      release()
      if (completion) await completion
      await page.unroute('**' + path, handler)
    }
  }
  const expectToastResult = async (element, title) => {
    await page.waitForFunction(
      ({ element, title }) =>
        element.isConnected &&
        element.querySelector('[data-slot="toast-title"]')?.textContent ===
          title,
      { element, title },
    )
    assert.ok(
      await element.isVisible(),
      'Result stays visible after navigation',
    )
  }
  const login = async (
    password = 'BrowserFixture123456',
    title = 'Login gagal',
  ) => {
    await page.getByLabel('Email', { exact: true }).fill('browser@example.test')
    await page.getByLabel('Password', { exact: true }).fill(password)
    const element = await withLoadingToast(
      '/api/auth/sign-in/email',
      'Memproses login...',
      async () => {
        await page.getByRole('button', { name: 'Masuk', exact: true }).click()
        assert.ok(
          await page.getByRole('button', { name: 'Memeriksa...' }).isDisabled(),
        )
      },
    )
    await expectToastResult(element, title)
  }
  await page.goto(baseURL + '/admin')
  await page.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await hydrate(page)
  assert.ok(page.url().includes('/admin/login'))
  const invalidBefore = await counts()
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page
    .locator('[data-slot="toast-title"]')
    .getByText('Periksa data login', { exact: true })
    .waitFor()
  assert.equal((await counts()).signInCalls, invalidBefore.signInCalls)
  await page.locator('[data-slot="toast"]').hover()
  await page.getByRole('button', { name: 'Tutup notifikasi' }).click()
  await login('WrongPassword123456')
  await page
    .locator('main')
    .getByText('Email atau password tidak cocok.')
    .waitFor()
  await control({ loginLimit: true })
  await login()
  await page
    .locator('main')
    .getByText(
      'Terlalu banyak percobaan login. Tunggu sebentar, lalu coba lagi.',
    )
    .waitFor()
  await control({ loginLimit: false, role: 'user' })
  await login()
  await page
    .locator('main')
    .getByText('Akun ini tidak memiliki akses admin.')
    .waitFor()
  assert.equal(
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    0,
  )
  await control({ role: 'admin' })
  const before = await counts()
  await login('BrowserFixture123456', 'Login berhasil')
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
  const failedLogout = await withLoadingToast(
    '/api/auth/sign-out',
    'Logging out...',
    async () => {
      if (
        !(await page
          .getByRole('button', { name: 'Log out', exact: true })
          .isVisible())
      )
        await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.getByRole('button', { name: 'Log out', exact: true }).click()
      assert.ok(
        await page.getByRole('button', { name: 'Logging out...' }).isDisabled(),
      )
    },
  )
  await expectToastResult(failedLogout, 'Log out failed')
  await page
    .getByText(
      'Your session could not be confirmed as ended. Try logging out again.',
      { exact: true },
    )
    .last()
    .waitFor()
  await page.getByRole('button', { name: 'Close navigation' }).click()
  assert.equal(
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).count(),
    1,
  )
  await control({ outage: true })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page
    .getByRole('heading', { name: 'Admin session unavailable' })
    .waitFor()
  const retry = async (title) => {
    const element = await withLoadingToast(
      '/api/auth/get-session**',
      'Checking session...',
      async () => {
        await page.getByRole('button', { name: 'Try again' }).click()
      },
    )
    await expectToastResult(element, title)
  }
  await retry('Session check failed')
  await control({ outage: false })
  await retry('Session check complete')
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await control({ logoutFailure: false, role: 'user' })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page.getByRole('heading', { name: 'Admin access denied' }).waitFor()
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
  for (const target of [page, tab]) {
    await target.evaluate(() => {
      window.__logoutErrorScreens = []
      const record = () => {
        for (const heading of document.querySelectorAll('main h1')) {
          if (
            heading.textContent === 'Admin session unavailable' ||
            heading.textContent === 'Admin access denied'
          )
            window.__logoutErrorScreens.push(heading.textContent)
        }
      }
      window.__logoutObserver = new MutationObserver(record)
      window.__logoutObserver.observe(document.body, {
        childList: true,
        subtree: true,
      })
      record()
    })
  }
  const successfulLogout = await withLoadingToast(
    '/api/auth/sign-out',
    'Logging out...',
    async () => {
      if (
        !(await page
          .getByRole('button', { name: 'Log out', exact: true })
          .isVisible())
      )
        await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.getByRole('button', { name: 'Log out', exact: true }).click()
    },
  )
  await expectToastResult(successfulLogout, 'Logged out')
  await page.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  await control({ held: false })
  await tab.getByRole('heading', { name: 'Masuk ke admin' }).waitFor()
  for (const target of [page, tab]) {
    assert.deepEqual(
      await target.evaluate(() => {
        window.__logoutObserver.disconnect()
        return window.__logoutErrorScreens
      }),
      [],
      'Logout must reach login without rendering a session/access error screen',
    )
  }
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
    'Browser: validation/login/logout/session-retry loading and result toasts, native login wrong/429/non-admin/admin, authoritative1, safe cache, refresh, logout failure, role lock, in-flight logout, cross-tab and back denial passed.',
  )
} finally {
  await browser.close()
}
