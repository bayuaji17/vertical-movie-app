import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [baseURL, moduleURL, executablePath, screenshotPrefix] =
  process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
const errors = []
const forbidden = []
const sizes = [
  [320, 800],
  [390, 844],
  [768, 1024],
  [1024, 900],
  [1440, 1000],
  [1920, 1080],
]
const origin = new URL(baseURL).origin
const context = await browser.newContext({ colorScheme: 'light' })
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (
    url.origin !== origin ||
    /^\/api(?:\/|$)/.test(url.pathname) ||
    /playback|stream\.mux/.test(url.href)
  ) {
    forbidden.push(url.href)
    return route.abort()
  }
  return route.continue()
})
context.on('page', (page) => {
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
})
const page = await context.newPage()
page.setDefaultTimeout(20_000)
const cards = () => page.locator('[data-catalog-card]')
const search = () => page.getByRole('searchbox', { name: 'Search titles' })
const pause = () => page.waitForTimeout(150)
async function count(n) {
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-catalog-card]').length === n,
    n,
  )
}
async function theme(mode) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await pause()
  await page.getByRole('button', { name: 'Appearance', exact: true }).click()
  await page.getByRole('menuitemradio', { name: mode, exact: true }).click()
  await page.waitForFunction(
    (mode) => document.documentElement.dataset.themeMode === mode,
    mode.toLowerCase(),
  )
}
async function layout() {
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    ratios: [...document.querySelectorAll('[data-poster-frame]')].map(
      (element) => {
        const r = element.getBoundingClientRect()
        return Math.abs(r.height - (r.width * 16) / 9)
      },
    ),
    columns: getComputedStyle(
      document.querySelector('[data-catalog-grid]'),
    ).gridTemplateColumns.split(' ').length,
    targets: [
      ...document.querySelectorAll(
        'header:has([aria-label="Vertical Movie home"]) button, #catalog [data-slot="toggle-group-item"], #catalog select, header input',
      ),
    ]
      .filter((element) => element.getBoundingClientRect().width)
      .map((element) => element.getBoundingClientRect().height),
  }))
  assert.equal(result.overflow, false, 'horizontal overflow')
  assert(
    result.ratios.every((delta) => delta < 1),
    'poster ratio 9:16',
  )
  assert(
    result.targets.every((height) => height >= 43.9),
    '44px targets',
  )
  return result
}
async function dialog(index) {
  const trigger = cards().nth(index).getByRole('button')
  const title = await cards().nth(index).getByRole('heading').textContent()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const popup = page.getByRole('dialog')
  await popup.waitFor()
  assert.equal(await popup.getByRole('heading').textContent(), title)
  const bounds = await popup.boundingBox()
  const viewport = page.viewportSize()
  assert(
    bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= viewport.width + 1 &&
      bounds.y + bounds.height <= viewport.height + 1,
    'dialog viewport',
  )
  await page.keyboard.press('Tab')
  await pause()
  assert(
    await popup.evaluate((element) => element.contains(document.activeElement)),
    'dialog focus trap: ' +
      (await page.evaluate(() =>
        document.activeElement.outerHTML.slice(0, 180),
      )),
  )
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Escape')
  await popup.waitFor({ state: 'hidden' })
  await pause()
  assert(
    await trigger.evaluate((element) => document.activeElement === element),
    'dialog returns focus',
  )
}
try {
  const response = await fetch(baseURL)
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.equal(
    (html.match(/data-catalog-card/g) || []).length,
    6,
    'SSR first six',
  )
  for (const title of [
    'After the Rain',
    'The Last Train',
    'A Small Beginning',
    'Letters to Home',
    'Midnight Kitchen',
    'City in Motion',
  ])
    assert(html.includes(title), 'SSR title: ' + title)
  assert(
    html.includes('Vertical Movie') &&
      !html.includes('Welcome to TanStack Start'),
  )
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 120_000 })
  await count(6)
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main')).some((key) =>
      key.startsWith('__reactFiber'),
    ),
  )
  assert.equal(await page.title(), 'Vertical Movie — Find your next story')
  const closeDevtools = page.getByRole('button', {
    name: 'Close TanStack Devtools',
  })
  if (await closeDevtools.isVisible()) await closeDevtools.click()
  mkdirSync(dirname(screenshotPrefix), { recursive: true })
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    for (const mode of ['Light', 'Dark']) {
      await theme(mode)
      await pause()
      const result = await layout()
      assert.equal(
        result.columns,
        width < 640 ? 2 : width < 1024 ? 3 : width < 1280 ? 4 : 6,
      )
      await dialog(0)
      if ([390, 1440].includes(width)) {
        for (const image of await page.locator('main img').all())
          await image.scrollIntoViewIfNeeded()
        await page.waitForFunction(() =>
          [...document.querySelectorAll('main img')].every(
            (image) => image.complete && image.naturalWidth > 0,
          ),
        )
        await page.evaluate(async () => {
          await document.fonts.ready
          window.scrollTo(0, 0)
        })
        await page.screenshot({
          path:
            screenshotPrefix + '-' + mode.toLowerCase() + '-' + width + '.png',
          fullPage: true,
        })
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await theme('Light')
  await page
    .getByRole('button', { name: 'Load more', exact: true })
    .evaluate((element) => {
      element.click()
      element.click()
    })
  await count(12)
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await count(18)
  assert.equal(
    await page.getByRole('button', { name: 'Load more', exact: true }).count(),
    0,
  )
  await page.setViewportSize({ width: 320, height: 800 })
  await count(18)
  await layout()
  await dialog(14)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Series', exact: true }).click()
  await count(6)
  assert.equal(
    await page.getByRole('region', { name: 'Featured film' }).count(),
    0,
  )
  await dialog(0)
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await count(6)
  await page.getByRole('combobox', { name: 'Genre' }).selectOption('drama')
  await count(4)
  await page.getByRole('button', { name: 'Series', exact: true }).click()
  await count(1)
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await count(6)
  await search().fill('  STRANGERS  ')
  await count(1)
  assert.equal(
    await cards().first().getByRole('heading').textContent(),
    'After the Rain',
  )
  await search().fill('no-result-title')
  await count(0)
  await page.getByText('No titles found', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await count(6)
  assert(
    await search().evaluate((element) => document.activeElement === element),
  )
  // Canonically equivalent input must keep already loaded pages.
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await count(12)
  await search().fill('   ')
  await count(12)
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await count(6)
  await page.getByRole('button', { name: 'Browse', exact: true }).click()
  assert(
    await page
      .locator('#catalog')
      .evaluate((element) => document.activeElement === element),
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Browse', exact: true })
    .click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await pause()
  assert(
    await page
      .locator('#catalog')
      .evaluate((element) => document.activeElement === element),
    'mobile browse focus',
  )
  await page.getByRole('button', { name: 'Standalone', exact: true }).click()
  await count(6)
  await dialog(0)
  // Exercise the public controls using the keyboard, including radio menus.
  await page.setViewportSize({ width: 1440, height: 1000 })
  const home = page.getByRole('button', { name: 'Home', exact: true })
  await home.focus()
  await page.keyboard.press('Enter')
  await count(6)
  await search().focus()
  await page.keyboard.type('strangers')
  await count(1)
  await home.focus()
  await page.keyboard.press('Enter')
  await count(6)
  await page.getByRole('button', { name: 'All', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-slot="toggle-group-item"][aria-pressed="true"]',
      )?.textContent === 'Film',
  )
  await count(6)
  await page.getByRole('combobox', { name: 'Genre' }).focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await count(3)
  await home.focus()
  await page.keyboard.press('Enter')
  await count(6)
  await page.getByRole('button', { name: 'Load more', exact: true }).focus()
  await page.keyboard.press('Enter')
  await count(12)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Appearance', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('menuitemradio', { name: 'Light', exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => document.documentElement.dataset.themeMode === 'dark',
  )
  await page.getByRole('menu').waitFor({ state: 'hidden' })
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await theme('System')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('dark'),
    )
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.themeMode === 'system' &&
        document.documentElement.classList.contains('dark'),
    )
    await page.emulateMedia({ colorScheme: 'light' })
    await page.waitForFunction(
      () => !document.documentElement.classList.contains('dark'),
    )
    await theme('Dark')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(
      () => document.documentElement.dataset.themeMode === 'dark',
    )
  }
  // Fail a source and its fallback: only one switch, no error/request loop.
  let sourceAttempts = 0,
    fallbackAttempts = 0
  await context.route('**/images/catalog/after-the-rain.png', (route) => {
    sourceAttempts++
    return route.abort()
  })
  await context.route('**/images/catalog/poster-fallback.svg', (route) => {
    fallbackAttempts++
    return route.abort()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(
    () =>
      document.querySelector('img')?.getAttribute('src') ===
      '/images/catalog/poster-fallback.svg',
  )
  await pause()
  assert(sourceAttempts <= 2 && fallbackAttempts <= 2 && fallbackAttempts >= 1)
  // Failed-image console messages are expected for the deliberate abort above.
  const unexpected = errors.filter(
    (error) => !error.includes('net::ERR_FAILED'),
  )
  assert.deepEqual(unexpected, [], 'console/hydration errors')
  assert.deepEqual(forbidden, [], 'API/auth/playback/external requests')
  console.log(
    JSON.stringify({
      result: 'passed',
      baseURL,
      matrix: 12,
      SSR: 6,
      pages: [6, 12, 18],
      forbiddenRequests: forbidden.length,
      errors: unexpected.length,
      fallback: { sourceAttempts, fallbackAttempts },
      screenshots: screenshotPrefix,
    }),
  )
} finally {
  await browser.close()
}
