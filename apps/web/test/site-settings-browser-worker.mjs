import assert from 'node:assert/strict'
const [baseURL, moduleURL, executablePath, controlURL] = process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  await context.addCookies([
    {
      name: 'browser-fixture',
      value: 'admin',
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const page = await context.newPage(),
    errors = []
  let browserSettingsGets = 0
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (r) => {
    if (new URL(r.url()).pathname === '/api/site-settings')
      browserSettingsGets++
  })
  page.setDefaultTimeout(15000)
  const proof = async () =>
    await (await fetch(controlURL + '/settings-proof')).json()
  const control = async (input) =>
    assert.equal(
      (
        await fetch(controlURL + '/control/settings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
      ).status,
      200,
    )
  const navigate = async () => {
    await page.goto(baseURL + '/admin/settings')
    await page.waitForFunction(
      () => !!document.querySelector('#setting-siteName')?.value,
    )
  }
  const field = (label) => page.getByLabel(label, { exact: true }),
    save = page.getByRole('button', { name: 'Save changes', exact: true })
  await navigate()
  assert.equal(await save.isDisabled(), true)
  const initial = await proof()
  assert.equal(initial.sqlReads, 1)
  assert.equal(initial.publicReads, 1)
  for (const width of [320, 390, 768, 1024, 1440])
    for (const theme of ['light', 'dark', 'system']) {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.evaluate((mode) => {
        localStorage.setItem('vertical-movie-theme', mode)
        dispatchEvent(
          new StorageEvent('storage', {
            key: 'vertical-movie-theme',
            newValue: mode,
          }),
        )
      }, theme)
      await page.waitForFunction(
        (mode) => document.documentElement.dataset.themeMode === mode,
        theme,
      )
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${width}/${theme}`,
      )
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.classList.contains('dark'),
        ),
        theme !== 'light',
      )
      await field('Site name').fill('W'.repeat(80))
      assert.ok((await field('Site name').boundingBox()).height >= 44)
    }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await field('Site name').fill(' ')
  assert.equal(await save.isDisabled(), true)
  await field('Site name').fill('😀'.repeat(81))
  assert.equal(await save.isDisabled(), true)
  await field('Site name').fill('Runtime Brand')
  await field('Site name').focus()
  await page.keyboard.press('Tab')
  assert.equal(
    await field('Tagline').evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  )
  await field('Tagline').fill('Runtime tagline')
  await field('Site description').fill('Runtime description')
  await field('Footer text').fill('Runtime footer')
  await save.click()
  await page.getByText('Site settings saved.', { exact: true }).waitFor()
  assert.equal((await proof()).saves, 1)
  assert.equal((await proof()).sqlReads, initial.sqlReads)
  const firstReceipt = Date.now()
  const firstPublic = await (
    await page.request.get(baseURL + '/api/site-settings')
  ).json()
  assert.ok(firstPublic.freshForMs > 0 && firstPublic.freshForMs <= 3600000)
  // New SSR requests and hydration consume the writer's web snapshot without an API refill.
  for (let i = 0; i < 10; i++) {
    const response = await page.request.get(baseURL + '/')
    assert.equal(response.status(), 200)
    assert.match(await response.text(), /Runtime Brand/)
  }
  await page.goto(baseURL + '/')
  await page.getByRole('link', { name: 'Runtime Brand home' }).waitFor()
  assert.equal(await page.title(), 'Runtime Brand — Runtime tagline')
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute('content'),
    'Runtime description',
  )
  assert.equal((await proof()).publicReads, initial.publicReads)
  assert.equal(browserSettingsGets, 0)
  const secondReceipt = Date.now()
  const secondPublic = await (
    await page.request.get(baseURL + '/api/site-settings')
  ).json()
  assert.ok(secondPublic.freshForMs < firstPublic.freshForMs)
  assert.ok(
    secondReceipt + secondPublic.freshForMs <=
      firstReceipt + firstPublic.freshForMs + 200,
  )
  // Same QueryClient survives SPA navigation; Save updates the public head and shell.
  await page.evaluate(() => {
    history.pushState({}, '', '/admin/settings')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await field('Site name').waitFor()
  await field('Site name').fill('Client Brand')
  await save.click()
  await page.getByText('Site settings saved.', { exact: true }).waitFor()
  // Browser history navigation retains the same router and QueryClient.
  await page.evaluate(() => {
    history.pushState({}, '', '/')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.getByRole('link', { name: 'Client Brand home' }).waitFor()
  await page.waitForFunction(
    () => document.title === 'Client Brand — Runtime tagline',
  )
  assert.equal((await proof()).publicReads, initial.publicReads)
  await navigate()
  await field('Tagline').fill('Unsaved')
  await page.getByRole('link', { name: 'Content', exact: true }).click()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).focus()
  await page.keyboard.press('Enter')
  assert.equal(await field('Tagline').inputValue(), 'Unsaved')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page
    .getByRole('button', { name: 'Discard changes', exact: true })
    .click()
  assert.equal(await field('Tagline').inputValue(), 'Runtime tagline')
  await field('Site name').fill('My draft')
  await control({ externalName: 'Other writer' })
  await save.click()
  await page.getByText('Settings conflict', { exact: true }).waitFor()
  assert.equal(await field('Site name').inputValue(), 'My draft')
  assert.equal(await save.isDisabled(), true)
  await page
    .getByRole('button', { name: 'Reload saved values', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Discard and reload', exact: true })
    .click()
  await page.waitForFunction(
    () => document.querySelector('#setting-siteName')?.value === 'Other writer',
  )
  await control({ mode: 'commit-unknown' })
  await field('Site name').fill('Recovered Brand')
  await save.click()
  await page.getByText('Save not confirmed', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page
    .getByText(
      'Cancel restores the last confirmed values in this editor. Use Check saved values to verify an unconfirmed Save.',
      { exact: true },
    )
    .waitFor()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  const unknown = await proof()
  await page
    .getByRole('button', { name: 'Check saved values', exact: true })
    .click()
  await page
    .getByText('Saved values match your last attempt.', { exact: true })
    .waitFor()
  assert.equal((await proof()).saves, unknown.saves)
  await control({ mode: 'normal' })
  await context.setOffline(true)
  await page.getByText('You are offline.', { exact: true }).waitFor()
  await field('Tagline').fill('Offline draft')
  assert.equal(await save.isDisabled(), true)
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page
    .getByRole('button', { name: 'Discard changes', exact: true })
    .click()
  const literal = '<script>window.settingsAttack=1</script>'
  await field('Site name').fill(literal)
  await field('Tagline').fill('')
  await field('Site description').fill('')
  await field('Footer text').fill('')
  await save.click()
  await page.getByText('Site settings saved.', { exact: true }).waitFor()
  await page.goto(baseURL + '/')
  await page.getByRole('link', { name: literal + ' home' }).waitFor()
  assert.equal(await page.evaluate(() => window.settingsAttack), undefined)
  assert.equal(await page.title(), literal)
  await navigate()
  await control({ held: true })
  await page
    .getByRole('button', { name: 'Reload saved values', exact: true })
    .click()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.waitForURL(/\/admin\/login(?:\?|$)/)
  await control({ held: false })
  assert.equal(await page.locator('#setting-siteName').count(), 0)
  assert.deepEqual(errors, [])
  console.log(
    'Browser: settings 15 real theme/width combinations; Save SSR/client branding/head;10 warm SSR+hydration zero API refill; validation/literal empty fields/cancel/leave/conflict/unknown reconciliation/offline/held logout passed. SQL/API counters ' +
      JSON.stringify(await proof()),
  )
  await context.close()
} finally {
  await browser.close()
}
