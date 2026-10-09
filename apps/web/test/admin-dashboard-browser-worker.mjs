import assert from 'node:assert/strict'
const [baseURL, moduleURL, executablePath, controlURL, screenshotPrefix] =
  process.argv.slice(2)
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
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /hydration|Minified React error/i.test(m.text())
    )
      errors.push(m.text())
  })
  const control = async (input) => {
    const response = await fetch(controlURL + '/control/dashboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    assert.equal(response.status, 200)
  }
  const auth = async (input) =>
    fetch(controlURL + '/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  const proof = async () =>
    await (await fetch(controlURL + '/dashboard-proof')).json()
  const wait = async () => {
    try {
      await page
        .getByLabel('Film total 125', { exact: true })
        .waitFor({ timeout: 15000 })
    } catch (error) {
      console.error(
        'Dashboard debug',
        JSON.stringify({
          proof: await proof(),
          body: await page.locator('main').innerText(),
          errors,
        }),
      )
      throw error
    }
  }
  const go = async () => {
    await page.goto(baseURL + '/admin', { waitUntil: 'networkidle' })
    await wait()
  }
  await auth({ role: 'admin', outage: false, held: false })
  let before = (await proof()).reads
  const ssr = await fetch(baseURL + '/admin', {
      headers: { cookie: 'browser-fixture=admin' },
    }),
    html = await ssr.text()
  assert.equal(ssr.status, 200)
  assert.equal((await proof()).reads, before)
  assert.match(html, /Loading dashboard/)
  assert.doesNotMatch(
    html,
    /Dashboard film|privateUnexpected|PRIVATE-BROWSER-TOKEN/,
  )
  await control({ held: true })
  await page.goto(baseURL + '/admin', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
  await page.getByRole('status', { name: 'Loading dashboard' }).waitFor()
  assert.equal(await page.getByTestId('dashboard-count-film').count(), 0)
  await control({ held: false })
  await wait()
  assert.equal(
    await page.locator('[data-testid="dashboard-latest"] > li').count(),
    8,
  )
  assert.equal(
    await page.locator('[data-testid="dashboard-failures"] > li').count(),
    5,
  )
  await page.getByText('Unpublished (legacy)', { exact: true }).waitFor()
  assert.equal(
    await page.getByTestId('dashboard-count-episode').getByRole('link').count(),
    0,
  )
  const ids = (await proof()).ids
  const episode = page.locator(
    `a[href="/admin/series/${ids.series}/episodes/${ids.episode}"]`,
  )
  assert.equal(await episode.count(), 1)
  await episode.click()
  await page
    .getByRole('heading', { name: 'Dashboard episode 3', exact: true })
    .waitFor()
  await go()
  const latestHref = await page
    .locator('[data-testid="dashboard-latest"] a')
    .first()
    .getAttribute('href')
  await page.locator('[data-testid="dashboard-latest"] a').first().click()
  assert.ok(page.url().endsWith(latestHref))
  await go()
  // Single pending manual refresh retains old data/time and rejects duplicate activation.
  const timestamp = await page
    .getByTestId('dashboard-summary')
    .locator('time')
    .first()
    .getAttribute('datetime')
  await control({ held: true })
  before = (await proof()).reads
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByRole('button', { name: 'Refreshing…', exact: true }).waitFor()
  assert.equal(
    await page
      .getByRole('button', { name: 'Refreshing…', exact: true })
      .isDisabled(),
    true,
  )
  await wait()
  await page
    .getByRole('button', { name: 'Refreshing…', exact: true })
    .evaluate((el) => el.click())
  assert.equal((await proof()).reads, before + 1)
  assert.equal(
    await page
      .getByTestId('dashboard-summary')
      .locator('time')
      .first()
      .getAttribute('datetime'),
    timestamp,
  )
  await control({ failure: 503, held: false })
  await page
    .getByText('Dashboard could not be refreshed', { exact: true })
    .waitFor()
  await page.getByText(/Stale data · Last updated/).waitFor()
  await wait()
  // Failed reads pause interval. Browser clock verifies the30s policy without waiting a wall-clock minute.
  await page.clock.install()
  before = (await proof()).reads
  await page.clock.fastForward(31000)
  assert.equal((await proof()).reads, before)
  await control({ failure: 0 })
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await wait()
  await page.getByRole('button', { name: 'Refresh', exact: true }).waitFor()
  before = (await proof()).reads
  const poll = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/admin/dashboard/summary') && r.status() === 200,
  )
  await page.clock.fastForward(31000)
  await poll
  assert.ok((await proof()).reads > before)
  // Invisible/offline intervals stop; reconnect recovers.
  await context.setOffline(true)
  await page.getByText('You are offline', { exact: true }).waitFor()
  assert.equal(
    await page
      .getByRole('button', { name: 'Refresh', exact: true })
      .isDisabled(),
    true,
  )
  before = (await proof()).reads
  await page.clock.fastForward(31000)
  assert.equal((await proof()).reads, before)
  await context.setOffline(false)
  await wait()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  before = (await proof()).reads
  await page.clock.fastForward(31000)
  assert.equal((await proof()).reads, before)
  await page.evaluate(() => {
    delete document.visibilityState
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await wait()
  // Confirmed metadata create invalidates the unmounted summary without a hidden read.
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  await page
    .getByRole('heading', { name: 'Create draft', exact: true })
    .waitFor()
  await page
    .getByLabel('Title *', { exact: true })
    .fill('Dashboard browser new draft')
  before = (await proof()).reads
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  await page.getByText('Dashboard browser new draft', { exact: true }).waitFor()
  assert.equal((await proof()).reads, before)
  await page.goto(baseURL + '/admin', { waitUntil: 'networkidle' })
  await page.getByLabel('Film total 126', { exact: true }).waitFor()
  await control({ advanceJob: true, publishFilm: true })
  const externalPoll = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/admin/dashboard/summary') && r.status() === 200,
  )
  await page.clock.fastForward(31000)
  await externalPoll
  await page.getByLabel('queued jobs 1', { exact: true }).waitFor()
  await page.getByLabel('failed jobs 8', { exact: true }).waitFor()
  const published = await page
    .getByTestId('dashboard-count-film')
    .locator('dl div')
    .filter({ has: page.locator('dt').filter({ hasText: 'published' }) })
    .locator('dd')
    .innerText()
  assert.equal(published, '3')
  await control({ mode: 'empty' })
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByLabel('Film total 0', { exact: true }).waitFor()
  await page.getByText('No content yet', { exact: true }).waitFor()
  await page
    .getByText('No current failed media jobs', { exact: true })
    .waitFor()
  await control({ mode: 'large', longTitle: true })
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page
    .getByLabel(`Film total ${Number.MAX_SAFE_INTEGER}`, { exact: true })
    .waitFor()
  // Fifteen responsive/theme cases, long titles and safe-integer counts.
  let cases = 0
  for (const width of [320, 390, 768, 1024, 1440])
    for (const theme of ['light', 'dark', 'system']) {
      await page.setViewportSize({ width, height: 1000 })
      await page
        .getByRole('button', { name: 'Account menu', exact: true })
        .click()
      await page
        .getByRole('menuitemradio', {
          name: theme[0].toUpperCase() + theme.slice(1),
          exact: true,
        })
        .press('Enter')
      await page.keyboard.press('Escape')
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.themeMode),
        theme,
      )
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${width}/${theme} overflow`,
      )
      for (const name of ['Create draft', 'View content', 'Refresh']) {
        const target = page
          .getByRole('button', {
            name,
            exact: true,
          })
          .first()
        const box = await target.boundingBox()
        assert.ok(box.height >= 44, `${name} touch target`)
      }
      cases++
    }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Refresh', exact: true }).focus()
  assert.equal(
    await page
      .getByRole('button', { name: 'Refresh', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  )
  if (screenshotPrefix) {
    await page.screenshot({
      path: screenshotPrefix + 'desktop.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: screenshotPrefix + 'mobile.png',
      fullPage: true,
    })
  }
  // Cold failure/invalid response cannot create fake zero cards.
  await control({ mode: 'invalid' })
  await page.reload({ waitUntil: 'networkidle' })
  await page
    .getByText('Dashboard could not be refreshed', { exact: true })
    .waitFor()
  assert.equal(await page.getByTestId('dashboard-count-film').count(), 0)
  await control({ mode: 'normal', failure: 503 })
  await page.reload({ waitUntil: 'networkidle' })
  await page
    .getByText('Dashboard could not be refreshed', { exact: true })
    .waitFor()
  assert.equal(await page.getByTestId('dashboard-count-film').count(), 0)
  await control({ failure: 0 })
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.getByLabel('Film total 126', { exact: true }).waitFor()
  // Held late response is fenced after authoritative role loss.
  await control({ held: true })
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByRole('button', { name: 'Refreshing…', exact: true }).waitFor()
  await auth({ role: 'user' })
  await page.evaluate(() => {
    const channel = new BroadcastChannel('vertical-movie-admin-auth')
    channel.postMessage({ type: 'auth-changed' })
    channel.close()
  })
  await page
    .getByRole('heading', { name: 'Admin access denied', exact: true })
    .waitFor()
  await control({ held: false })
  assert.equal(await page.getByTestId('dashboard-summary').count(), 0)
  before = (await proof()).reads
  await page.clock.fastForward(31000)
  assert.equal((await proof()).reads, before)
  assert.deepEqual(errors, [])
  console.log(
    'Browser: ' +
      JSON.stringify({
        dashboard: 'passed',
        responsiveThemeCases: cases,
        ssrNoSummaryRead: true,
        nativeDatabase: true,
        auth: 'injected browser fixture; native cookie proof separate',
        externalTransitions: 'real SQL publication/job fixtures',
        emptyLarge: 'explicit UI fixture modes',
        races: true,
        polling: true,
      }),
  )
} finally {
  await browser.close()
}
