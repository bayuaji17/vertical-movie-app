import assert from 'node:assert/strict'
// Usage: bun admin-delete-browser-worker.mjs <base> <playwright module URL> <chromium path|""> <state.json> <screenshot dir>
// Runs against a real API + dedicated database (see apps/api/test/integration/content-delete-browser-fixture.ts).
const [base, moduleURL, executablePath, stateFile, shots] =
  process.argv.slice(2)
const { chromium } = await import(moduleURL)
const state = await Bun.file(stateFile).json()
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
})
const errors = []
const results = []
const ok = (name) => (results.push(name), console.log('ok -', name))
async function session(viewport, tag) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`))
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /hydration|Minified React error/i.test(m.text())
    )
      errors.push(`${tag}: ${m.text()}`)
  })
  await page.goto(base + '/admin/login', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForLoadState('load')
  await page.waitForFunction(
    () =>
      document.querySelector('form') &&
      Object.keys(document.querySelector('form')).some((k) =>
        k.startsWith('__react'),
      ),
    null,
    { timeout: 90000 },
  )
  await page.getByLabel('Email').fill(state.admin.email)
  await page.getByLabel('Password').first().fill(state.admin.password)
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(/\/admin(\/)?$/, { timeout: 20000 })
  return { context, page }
}
const shot = (page, name) =>
  page.screenshot({ path: `${shots}/${name}.png`, fullPage: false })
async function list(page, { type = 'Film', archived = false } = {}) {
  await page.goto(base + '/admin/content', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 60000 })
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) =>
      k.startsWith('__react'),
    ),
  )
  if (type !== 'Film')
    await page
      .getByRole('tab', { name: type })
      .or(page.getByText(type, { exact: true }).first())
      .first()
      .click()
  if (archived)
    await page.getByRole('checkbox', { name: 'Include archived' }).check()
  await page
    .getByText(/^Showing \d+/)
    .first()
    .waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
}
// Visible "Details"/"View" action of an item (table row on desktop, card on mobile).
const entry = (page, title) =>
  page.getByRole('button', { name: new RegExp(`^(Details|View) ${title}$`) })
const row = (page, title) => page.getByRole('row').filter({ hasText: title })
async function open(page, title, opts) {
  await list(page, opts)
  await entry(page, title).first().click()
  await page.waitForURL(
    /\/admin\/content\/(film|standalone|series)\/[0-9a-f-]+\/?$/,
    { timeout: 60000 },
  )
  await page
    .getByRole('heading', { level: 1, name: 'Content details' })
    .waitFor({ timeout: 60000 })
}
const present = async (page, title, opts) => {
  await list(page, opts)
  return (await entry(page, title).count()) > 0
}
const dialog = (page) => page.getByRole('alertdialog')
const toast = (page) => page.getByText('Deleted', { exact: true })

try {
  // ---- desktop
  const { context, page } = await session(
    { width: 1440, height: 1000 },
    'desktop',
  )

  // 1. published content cannot be deleted and explains why
  await open(page, 'Browser Live Film')
  const blocked = page.getByRole('button', { name: /^Delete/ })
  assert.equal(await blocked.getAttribute('aria-disabled'), 'true')
  await page.getByText('Archive it first').first().waitFor()
  await blocked.click({ force: true })
  assert.equal(await dialog(page).count(), 0)
  await shot(page, '1-published-blocked')
  ok('published film: delete is disabled with a reason and opens no dialog')

  // 2. draft film: cancel keeps it, confirm deletes and returns to the list
  await open(page, 'Browser Draft Film')
  await page.getByRole('button', { name: 'Delete film' }).click()
  await dialog(page).waitFor()
  await dialog(page).getByText('This cannot be undone.').waitFor()
  await shot(page, '2-draft-dialog')
  await dialog(page).getByRole('button', { name: 'Cancel' }).click()
  await dialog(page).waitFor({ state: 'detached' })
  assert.ok(await present(page, 'Browser Draft Film'))
  await open(page, 'Browser Draft Film')
  await page.getByRole('button', { name: 'Delete film' }).click()
  await dialog(page).getByRole('button', { name: 'Delete film' }).click()
  await page.waitForURL(/\/admin\/content(\?.*)?$/)
  await toast(page).first().waitFor()
  await shot(page, '3-draft-deleted')
  assert.ok(!(await present(page, 'Browser Draft Film')))
  ok(
    'draft film: cancel keeps it; confirm deletes, shows a toast and leaves the list without it',
  )

  // 3. a film with a running job is refused and stays
  await open(page, 'Browser Busy Film')
  await page.getByRole('button', { name: 'Delete film' }).click()
  await dialog(page).getByRole('button', { name: 'Delete film' }).click()
  await dialog(page).getByRole('alert').waitFor()
  assert.match(
    await dialog(page).getByRole('alert').innerText(),
    /still running|in progress|processing/i,
  )
  await shot(page, '4-busy-refused')
  await dialog(page).getByRole('button', { name: 'Cancel' }).click()
  assert.ok(await present(page, 'Browser Busy Film'))
  ok(
    'busy film: server refuses with CONTENT_BUSY message and nothing is removed',
  )

  // 4. archived standalone deleted straight from the list
  await list(page, { type: 'Standalone', archived: true })
  await row(page, 'Browser Archived Short')
    .getByRole('button', { name: /^Delete/ })
    .click()
  await dialog(page)
    .getByRole('button', { name: 'Delete video' })
    .or(
      dialog(page)
        .getByRole('button', { name: /^Delete/ })
        .last(),
    )
    .first()
    .click()
  await toast(page).first().waitFor()
  await row(page, 'Browser Archived Short').waitFor({ state: 'detached' })
  await shot(page, '5-archived-deleted-from-list')
  ok(
    'archived standalone: deleted from the list row and removed without reloading',
  )

  // 5. season, then series with typed title
  const seasons = `${base}/admin/series/${state.ids.series}/seasons`
  await page.goto(seasons, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.getByText('Season 2', { exact: true }).first().waitFor()
  await shot(page, '6-seasons-before')
  await page
    .getByRole('button', { name: /^Delete/ })
    .last()
    .click()
  await dialog(page)
    .getByText('All episodes of this season are deleted with it.')
    .waitFor()
  await dialog(page).getByRole('button', { name: 'Delete season' }).click()
  await page
    .getByText('Season 2', { exact: true })
    .waitFor({ state: 'detached' })
  await page.getByText('Season 1', { exact: true }).first().waitFor()
  await shot(page, '7-season-deleted')
  ok('season: deleted with its episodes; the other season stays')

  await open(page, 'Browser Draft Series', { type: 'Series' })
  await page
    .getByText('Browser Draft Series', { exact: true })
    .first()
    .waitFor()
  await page.getByRole('button', { name: 'Delete series' }).click()
  const confirm = dialog(page).getByRole('button', { name: 'Delete series' })
  assert.equal(await confirm.isDisabled(), true)
  await dialog(page).getByRole('textbox').fill('browser draft')
  assert.equal(await confirm.isDisabled(), true)
  await dialog(page).getByRole('textbox').fill('Browser Draft Series')
  assert.equal(await confirm.isDisabled(), false)
  await shot(page, '8-series-dialog')
  await confirm.click()
  await page.waitForURL(/\/admin\/content(\?.*)?$/)
  assert.ok(!(await present(page, 'Browser Draft Series', { type: 'Series' })))
  ok(
    'series: needs the exact title, then deletes the series and its remaining episodes',
  )
  await page.goto(`${base}/admin/content/series/${state.ids.series}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await shot(page, '9-series-gone')
  await context.close()

  // ---- mobile
  const mobile = await session({ width: 390, height: 844 }, 'mobile')
  await open(mobile.page, 'Browser Mobile Film')
  const trigger = mobile.page.getByRole('button', { name: 'Delete film' })
  const box = await trigger.boundingBox()
  assert.ok(box.height >= 44, `touch target ${box.height}`)
  await trigger.click()
  await dialog(mobile.page).waitFor()
  const dbox = await dialog(mobile.page).boundingBox()
  assert.ok(
    dbox.x >= 0 && dbox.x + dbox.width <= 390,
    'dialog fits the viewport',
  )
  assert.equal(
    await mobile.page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await shot(mobile.page, '10-mobile-dialog')
  await dialog(mobile.page).getByRole('button', { name: 'Delete film' }).click()
  await mobile.page.waitForURL(/\/admin\/content(\?.*)?$/)
  assert.ok(!(await present(mobile.page, 'Browser Mobile Film')))
  await shot(mobile.page, '11-mobile-deleted')
  ok('mobile: 44 px target, dialog fits 390 px, deletion works')
  await mobile.context.close()

  assert.deepEqual(errors, [], errors.join('\n'))
  ok('no page errors or hydration warnings')
  console.log(JSON.stringify({ passed: results.length }))
} finally {
  await browser.close()
}
