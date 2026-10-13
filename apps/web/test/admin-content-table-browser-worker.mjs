import assert from 'node:assert/strict'
// Usage: bun admin-content-table-browser-worker.mjs <base> <playwright module URL> <chromium path|""> <state.json> <screenshot dir>
// Runs against a real API + worker + MinIO and the dedicated database seeded by
// apps/api/test/integration/content-delete-browser-fixture.ts (seed first).
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
  await page.waitForFunction(
    () =>
      Object.keys(document.querySelector('form') ?? {}).some((k) =>
        k.startsWith('__react'),
      ),
    null,
    { timeout: 90000 },
  )
  await page.getByLabel('Email').fill(state.admin.email)
  await page.getByLabel('Password').first().fill(state.admin.password)
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(/\/admin\/?$/, { timeout: 30000 })
  return { context, page }
}
const shot = (page, name) => page.screenshot({ path: `${shots}/${name}.png` })
// The footer is absent when nothing is listed; the empty state says so instead.
const ready = (page) =>
  page
    .getByText(/^Showing \d+/)
    .or(page.getByText(/^No (matching )?content/))
    .first()
    .waitFor({ timeout: 60000 })
async function go(page, path) {
  await page.goto(base + path, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await ready(page)
}
// Titles of the visible rows (the table on desktop, the cards on mobile).
const titles = (page) =>
  page
    .locator(
      '[aria-label="Content list"] a[href*="/admin/content/"]:not([role="button"])',
    )
    .evaluateAll((links) => [
      ...new Set(
        links
          .filter((a) => a.offsetParent !== null)
          .map((a) => a.textContent.trim()),
      ),
    ])
const names = [
  'Browser Busy Film',
  'Browser Live Film',
  'Browser Mobile Film',
  'Browser Draft Film',
]
const pressed = (page, name) =>
  page.getByRole('button', { name }).first().getAttribute('aria-pressed')
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

try {
  const { context, page } = await session(
    { width: 1440, height: 1000 },
    'desktop',
  )

  // 1. what a row tells the admin
  await go(page, '/admin/content')
  await page.waitForFunction(
    () => document.querySelectorAll('img[alt^="Cover of"]').length > 0,
  )
  assert.deepEqual(await titles(page), names)
  const row = (title) => page.getByRole('row').filter({ hasText: title })
  const rowText = async (title) =>
    (await row(title).innerText()).replace(/\s+/g, ' ')
  assert.match(await rowText('Browser Busy Film'), /Uploading/)
  assert.match(await rowText('Browser Live Film'), /Live/)
  assert.match(await rowText('Browser Mobile Film'), /Ready to publish/)
  const draft = await rowText('Browser Draft Film')
  assert.match(draft, /Needs cover/)
  assert.match(draft, /2024/)
  assert.match(draft, /Comedy/)
  assert.match(draft, /Drama/)
  assert.match(draft, /\+1/)
  const tabs = await page
    .getByRole('button', { name: /^(Film|Standalone|Series)\b/ })
    .allInnerTexts()
  assert.deepEqual(
    tabs.map((t) => t.replace(/\s+/g, ' ').trim()),
    ['Film 4 items', 'Standalone 0 items', 'Series 1 items'],
  )
  const thumb = page.locator('img[alt="Cover of Browser Mobile Film"]').first()
  assert.deepEqual(
    await thumb.evaluate((i) => [i.complete, i.naturalWidth, i.naturalHeight]),
    [true, 90, 160],
  )
  // Only the item with a verified cover requests an image (the card list is hidden here).
  assert.equal(
    await page
      .locator('img[alt^="Cover of"]')
      .evaluateAll((els) => els.filter((e) => e.offsetParent).length),
    1,
  )
  assert.ok(await noOverflow(page))
  await shot(page, 't1-list')
  ok(
    'rows show status, readiness, genres/year, counts and a real cover thumbnail',
  )

  // 2. status filter, sort and search, all in the URL
  await page.getByRole('button', { name: /^Draft\b/ }).click()
  await page.waitForURL(/status=draft/)
  await ready(page)
  assert.deepEqual(
    (await titles(page)).sort(),
    [...names].filter((n) => n !== 'Browser Live Film').sort(),
  )
  assert.match(
    await page
      .getByRole('status')
      .filter({ hasText: 'result' })
      .first()
      .innerText(),
    /3 results · Draft/,
  )
  assert.equal(await pressed(page, /^Draft\b/), 'true')
  await page.getByRole('button', { name: /^Title\s*,\s*sort/ }).click()
  await page.waitForURL(/sort=title/)
  await ready(page)
  assert.deepEqual(await titles(page), [
    'Browser Busy Film',
    'Browser Draft Film',
    'Browser Mobile Film',
  ])
  assert.equal(
    await page
      .locator('th')
      .filter({ hasText: 'Title' })
      .getAttribute('aria-sort'),
    'ascending',
  )
  await page.getByRole('button', { name: /^Title\s*,\s*sort/ }).click()
  await page.waitForURL(/order=desc/)
  await ready(page)
  assert.deepEqual(await titles(page), [
    'Browser Mobile Film',
    'Browser Draft Film',
    'Browser Busy Film',
  ])
  assert.equal(
    await page
      .locator('th')
      .filter({ hasText: 'Title' })
      .getAttribute('aria-sort'),
    'descending',
  )
  await page.getByRole('button', { name: 'Clear all' }).click()
  await page.waitForFunction(() => location.search === '')
  await ready(page)
  assert.equal((await titles(page)).length, 4)
  // Search matches the slug; Escape clears it; "/" focuses the field.
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('/')
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    'content-search',
  )
  await page.keyboard.type('browser-draft')
  await page.waitForURL(/search=browser-draft/)
  await ready(page)
  assert.deepEqual(await titles(page), ['Browser Draft Film'])
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !location.search.includes('search='))
  await ready(page)
  assert.equal(await page.locator('#content-search').inputValue(), '')
  await page.locator('#content-search').fill('zzzz-nothing')
  await page.getByText('No matching content').waitFor({ timeout: 20000 })
  await shot(page, 't2-empty')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await ready(page)
  assert.equal((await titles(page)).length, 4)
  // A link saved before the status filter still works.
  await go(page, '/admin/content?type=standalone&includeArchived=true')
  assert.deepEqual(await titles(page), ['Browser Archived Short'])
  assert.equal(await pressed(page, /^All\b/), 'true')
  ok(
    'status filter, sorting, slug search, clear and old links work and live in the URL',
  )

  // 3. open an item and come back: filters are restored
  await go(page, '/admin/content?status=draft&sort=title&pageSize=2')
  const before = page.url()
  await page
    .getByRole('link', { name: 'Browser Busy Film', exact: true })
    .first()
    .click()
  await page.waitForURL(/\/admin\/content\/film\//)
  await page.goBack()
  await ready(page)
  assert.equal(page.url(), before)
  assert.equal(await pressed(page, /^Draft\b/), 'true')
  ok('returning from a detail page restores the filters, sort and page size')

  // 4. keyboard and names
  await go(page, '/admin/content')
  const trigger = page
    .getByRole('button', { name: 'Actions for Browser Draft Film' })
    .first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  assert.deepEqual(await page.getByRole('menuitem').allInnerTexts(), [
    'Details',
    'Edit draft',
    'Delete',
  ])
  await page.keyboard.press('Escape')
  await page.getByRole('menu').waitFor({ state: 'detached' })
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute('aria-label'),
    ),
    'Actions for Browser Draft Film',
  )
  // Every action names its row, so rows are distinguishable without sight.
  const labels = await page
    .getByRole('button', { name: /^Actions for / })
    .evaluateAll((els) =>
      els
        .filter((e) => e.offsetParent)
        .map((e) => e.getAttribute('aria-label')),
    )
  assert.equal(new Set(labels).size, labels.length)
  await page.getByRole('button', { name: /^Updated\s*,\s*sort/ }).focus()
  await page.keyboard.press('Enter')
  await page.waitForURL(/order=asc/)
  await page.waitForFunction(() =>
    [...document.querySelectorAll('th[aria-sort]')].some(
      (th) =>
        th.textContent.includes('Updated') &&
        th.getAttribute('aria-sort') === 'ascending',
    ),
  )
  assert.equal(
    await page
      .locator('th')
      .filter({ hasText: 'Updated' })
      .getAttribute('aria-sort'),
    'ascending',
  )
  await go(page, '/admin/content')
  ok(
    'menu and sort headers work from the keyboard; focus returns to the trigger; names are unique',
  )

  // 5. delete from the menu: counts, focus, and the other thumbnails
  await page
    .getByRole('button', { name: 'Actions for Browser Draft Film' })
    .first()
    .click()
  await page.getByRole('menuitem', { name: /Delete/ }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: /^Delete/ })
    .last()
    .click()
  await page
    .getByText('Deleted', { exact: true })
    .first()
    .waitFor({ timeout: 30000 })
  await page.waitForFunction(
    () => document.activeElement?.getAttribute('aria-label') === 'Content list',
    null,
    { timeout: 15000 },
  )
  const after = await page
    .getByRole('button', { name: /^(Film|Series)\b/ })
    .allInnerTexts()
  assert.match(after[0].replace(/\s+/g, ' '), /Film 3 items/)
  assert.deepEqual((await titles(page)).length, 3)
  assert.equal(
    await page
      .locator('img[alt="Cover of Browser Mobile Film"]')
      .first()
      .evaluate((i) => i.naturalWidth),
    90,
  )
  await shot(page, 't5-after-delete')
  ok(
    'deleting from the menu updates the list and counts, moves focus to the results and keeps thumbnails',
  )
  await context.close()

  // 6. mobile
  const mobile = await session({ width: 390, height: 500 }, 'mobile')
  const m = mobile.page
  await go(m, '/admin/content')
  await m.waitForFunction(
    () => document.querySelectorAll('img[alt^="Cover of"]').length > 0,
  )
  assert.ok(await noOverflow(m))
  await shot(m, 't6-mobile')
  await m.getByRole('button', { name: /^Filters/ }).click()
  await m
    .getByRole('dialog')
    .getByRole('button', { name: /^Published\b/ })
    .click()
  await m.waitForURL(/status=published/)
  await m.getByRole('dialog').getByRole('button', { name: 'Done' }).click()
  await m.getByRole('dialog').waitFor({ state: 'detached' })
  await ready(m)
  assert.deepEqual(await titles(m), ['Browser Live Film'])
  assert.match(
    (await m.getByRole('button', { name: /^Filters/ }).innerText()).replace(
      /\s+/g,
      ' ',
    ),
    /1\s*, 1 active/,
  )
  await m.getByRole('button', { name: 'Clear all' }).click()
  await m.waitForFunction(() => location.search === '')
  await ready(m)
  // Scroll position survives a visit to a detail page.
  // Bring the link into view first, so the click itself does not scroll.
  const link = m
    .getByRole('link', { name: 'Browser Mobile Film', exact: true })
    .first()
  await link.scrollIntoViewIfNeeded()
  await m.evaluate(() => window.scrollBy(0, 40))
  const y = await m.evaluate(() => Math.round(scrollY))
  assert.ok(y > 0, 'the page is scrolled')
  await link.click()
  await m.waitForURL(/\/admin\/content\/film\//)
  await m.goBack()
  await ready(m)
  await m.waitForTimeout(600)
  assert.equal(await m.evaluate(() => Math.round(scrollY)), y)
  // Footer takes at most two rows; touch targets stay at 44 px.
  const footer = await m
    .locator('#page-size')
    .evaluate((el) => el.closest('div.mt-5').getBoundingClientRect().height)
  assert.ok(footer <= 90, `footer height ${footer}`)
  const trig = await m
    .getByRole('button', { name: 'Actions for Browser Mobile Film' })
    .first()
    .boundingBox()
  assert.ok(trig.width >= 44 && trig.height >= 44)
  assert.ok(await noOverflow(m))
  ok(
    'mobile: filters sheet, thumbnails, restored scroll, compact footer and 44 px targets, no horizontal scroll',
  )
  await mobile.context.close()

  assert.deepEqual(errors, [], errors.join('\n'))
  ok('no page errors or hydration warnings')
  console.log(JSON.stringify({ passed: results.length }))
} finally {
  await browser.close()
}
