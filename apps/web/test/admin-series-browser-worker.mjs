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
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /hydration|Minified React error/i.test(m.text())
    )
      errors.push(m.text())
  })
  page.on('dialog', (dialog) => dialog.accept())
  const control = async (input) =>
    fetch(controlURL + '/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  await control({ role: 'admin', outage: false, held: false })
  const ids = (await (await fetch(controlURL + '/content-proof')).json()).ids
  const seriesId = ids.parentSeries,
    base = `/admin/series/${seriesId}/seasons`
  const go = async (path) => {
    await page.goto(baseURL + path, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { level: 1 }).waitFor()
  }
  const title = async (name) =>
    page.getByRole('heading', { name, exact: true }).waitFor()
  const save = () =>
    page.getByRole('button', { name: 'Save season', exact: true })
  await go(`/admin/content/series/${seriesId}`)
  await page.getByText('Manage seasons & episodes', { exact: true }).click()
  await title('Seasons & episodes')
  await page.getByText('Season 1', { exact: true }).waitFor()
  assert.equal(await page.getByText('Season 1', { exact: true }).count(), 1)
  await page.getByText('View episodes', { exact: true }).click()
  await title('Season 1 episodes')
  await page.getByText('Back to seasons', { exact: true }).click()
  await page.getByText('Add season', { exact: true }).click()
  await title('Add season')
  assert.equal(
    await page.getByLabel('Season number', { exact: true }).inputValue(),
    '2',
  )
  await page.getByLabel('Season number', { exact: true }).fill('0')
  await save().click()
  await page
    .getByText('Enter a whole season number from 1 to 2147483647.')
    .waitFor()
  assert.equal(
    await page
      .getByLabel('Season number', { exact: true })
      .getAttribute('aria-invalid'),
    'true',
  )
  await page.getByLabel('Season number', { exact: true }).fill('1')
  await save().click()
  await page
    .getByText('This season number is already reserved. Choose another number.')
    .waitFor()
  await page.getByLabel('Season number', { exact: true }).fill('2')
  await page.getByLabel('Season title', { exact: true }).fill('Second season')
  await page.getByLabel('Release year', { exact: true }).fill('2026')
  await page.getByLabel('Release date', { exact: true }).fill('2026-10-08')
  await save().click()
  await title('Seasons & episodes')
  const seasons = (
    await (
      await page.request.get(
        baseURL +
          '/api/admin/series/' +
          seriesId +
          '/seasons?includeArchived=true',
      )
    ).json()
  ).items
  assert.equal(seasons.length, 2)
  const second = seasons.find((row) => row.seasonNumber === 2)
  assert.equal(second.title, 'Second season')
  await go(`${base}/${second.id}/edit`)
  await title('Edit season')
  await page.getByLabel('Season title', { exact: true }).fill('Unsaved title')
  await page.getByText('Back to seasons', { exact: true }).click()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  assert.equal(
    await page.getByLabel('Season title', { exact: true }).inputValue(),
    'Unsaved title',
  )
  const update = await page.request.patch(
    baseURL + '/api/admin/seasons/' + second.id,
    { data: { expectedVersion: second.rowVersion, title: 'Concurrent title' } },
  )
  assert.equal(update.status(), 200)
  await save().click()
  await page.getByText(/This content changed in another session/).waitFor()
  assert.equal(
    await page.getByLabel('Season title', { exact: true }).inputValue(),
    'Unsaved title',
  )
  await page
    .getByRole('button', { name: 'Reload latest version', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Reload and discard', exact: true })
    .click()
  await page.waitForFunction(
    () => document.getElementById('title')?.value === 'Concurrent title',
  )
  await page.getByLabel('Season title', { exact: true }).fill('Final title')
  await save().click()
  await title('Seasons & episodes')
  const final = (
    await (
      await page.request.get(
        baseURL +
          '/api/admin/series/' +
          seriesId +
          '/seasons?includeArchived=true',
      )
    ).json()
  ).items.find((row) => row.id === second.id)
  assert.equal(final.title, 'Final title')
  assert.equal(final.rowVersion, 3)
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await go(`${base}/${second.id}/edit`)
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `overflow at ${width}`,
    )
    assert.ok((await save().boundingBox()).height >= 44)
    if (screenshotPrefix)
      await page.screenshot({
        path: screenshotPrefix + `season-${width}.png`,
        fullPage: true,
      })
  }
  await context.setOffline(true)
  await page.getByLabel('Season title', { exact: true }).fill('Offline input')
  await page.waitForFunction(
    () => document.querySelector('button[type="submit"]')?.disabled,
  )
  assert.equal(await save().isDisabled(), true)
  await context.setOffline(false)
  await page.getByText('Back to seasons', { exact: true }).click()
  await page
    .getByRole('button', { name: 'Discard and leave', exact: true })
    .click()
  await title('Seasons & episodes')
  assert.deepEqual(errors, [])
  await context.close()
  console.log(
    'Browser: Series editor default Season1, create, duplicate/validation, stale version, preserved dirty input, explicit reload, saved SQL metadata, selected season, responsive/offline passed.',
  )
} finally {
  await browser.close()
}
