import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [baseURL, moduleURL, executablePath, apiOrigin, screenshotPrefix] =
  process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
const errors = [],
  forbidden = [],
  requests = []
const context = await browser.newContext({
  colorScheme: 'light',
  viewport: { width: 1440, height: 1000 },
})
const origin = new URL(baseURL).origin
const control = async (body) => {
  const r = await fetch(apiOrigin + '/control/catalog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.equal(r.status, 200)
}
const proof = async () =>
  await (await fetch(apiOrigin + '/catalog-proof')).json()
await context.addCookies([
  { name: 'private-sentinel', value: 'must-not-forward', url: baseURL },
])
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (
    url.origin !== origin ||
    (/^\/api(?:\/|$)/.test(url.pathname) &&
      !/^\/api\/catalog(?:\/|$)/.test(url.pathname)) ||
    /playback|\.m3u8|stream\.mux/.test(url.href)
  ) {
    forbidden.push(url.href)
    return route.abort()
  }
  if (/^\/api\/catalog(?:\/|$)/.test(url.pathname))
    requests.push({ path: url.pathname, query: url.search })
  return route.continue()
})
const page = await context.newPage()
const posterResponses = []
page.on('response', (response) => {
  if (response.url().endsWith('/poster'))
    posterResponses.push({
      path: new URL(response.url()).pathname,
      status: response.status(),
    })
})
page.setDefaultTimeout(25_000)
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (
    message.type() === 'error' &&
    /hydration|React error|Invalid hook/i.test(message.text())
  )
    errors.push(message.text())
})
const cards = () => page.locator('[data-catalog-card]')
const count = async (n) =>
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-catalog-card]').length === n,
    n,
  )
const metaRequests = () => requests.filter((r) => r.path === '/api/catalog')
try {
  const html = await (await fetch(baseURL + '/')).text()
  assert.equal(
    (html.match(/<article\b[^>]*\bdata-catalog-card(?:="[^"]*")?/g) || [])
      .length,
    6,
    'SSR contains exactly six actual cards',
  )
  for (const privateField of [
    apiOrigin,
    'ready_job_id',
    'output_prefix',
    'source_asset_id',
    'S3_SECRET_ACCESS_KEY',
  ])
    assert.ok(
      !html.includes(privateField),
      'SSR must not expose ' + privateField,
    )
  await page.goto(baseURL + '/', { waitUntil: 'networkidle' })
  await count(6)
  assert.equal(
    metaRequests().length,
    0,
    'Fresh SSR hydration must not fetch page one again',
  )
  assert.equal(await page.locator('[aria-label="Featured film"]').count(), 1)
  const loaded = await page
    .locator('[data-poster-frame] img')
    .evaluateAll((images) =>
      images.every((image) => image.complete && image.naturalWidth === 1080),
    )
  assert.ok(loaded, 'Actual private WebP images decode at 1080x1920')
  await control({ holdNext: true })
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await page.locator('[data-catalog-skeleton]').first().waitFor()
  assert.equal(await cards().count(), 6)
  assert.equal(await page.locator('[data-catalog-skeleton]').count(), 6)
  assert.ok(
    await page
      .getByRole('button', { name: 'Loading more', exact: true })
      .isDisabled(),
  )
  await control({ holdNext: false })
  await count(12)
  await control({ catalogStatus: 503 })
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await page
    .getByRole('button', { name: 'Retry load more', exact: true })
    .waitFor()
  assert.equal(await cards().count(), 12)
  assert.equal(await page.locator('[data-catalog-skeleton]').count(), 0)
  const failedCursor = metaRequests().at(-1).query
  await control({ catalogStatus: 0 })
  await page
    .getByRole('button', { name: 'Retry load more', exact: true })
    .click()
  await count(18)
  assert.equal(
    metaRequests().at(-1).query,
    failedCursor,
    'Retry uses the failed cursor',
  )
  assert.equal(
    await page.getByRole('button', { name: 'Load more', exact: true }).count(),
    0,
  )
  const identities = await cards().evaluateAll((nodes) =>
    nodes.map((n) => n.dataset.catalogId),
  )
  assert.equal(new Set(identities).size, 18)
  const firstButton = cards().first().getByRole('button')
  await firstButton.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.waitForFunction(
    (button) => document.activeElement === button,
    await firstButton.elementHandle(),
  )
  assert.ok(
    await firstButton.evaluate((button) => document.activeElement === button),
    'Dialog returns focus',
  )
  await page
    .getByRole('searchbox', { name: 'Search titles' })
    .fill('absent-title')
  await page.getByText('No titles found', { exact: true }).waitFor()
  await count(0)
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await count(6)
  for (const [width, height] of [
    [320, 800],
    [390, 844],
    [768, 1024],
    [1024, 900],
    [1440, 1000],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height })
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      ratios: [...document.querySelectorAll('[data-poster-frame]')].map((e) => {
        const r = e.getBoundingClientRect()
        return Math.abs(r.height - (r.width * 16) / 9)
      }),
    }))
    assert.equal(layout.overflow, false, 'No horizontal overflow at ' + width)
    assert.ok(layout.ratios.every((v) => v < 1))
    if (screenshotPrefix && (width === 390 || width === 1440)) {
      for (const image of await page.locator('[data-poster-frame] img').all()) {
        await image.scrollIntoViewIfNeeded()
        await image.evaluate((element) => element.decode())
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      const path = screenshotPrefix + width + '-light.png'
      mkdirSync(dirname(path), { recursive: true })
      await page.screenshot({ path, fullPage: true })
    }
  }
  const p = await proof()
  assert.equal(p.authReads, 0)
  assert.ok(
    p.traces.every((t) => !t.cookie && !t.authorization),
    'Public upstream does not receive cookies or authorization',
  )
  assert.deepEqual(forbidden, [])
  assert.deepEqual(errors, [])
  console.log(
    'Browser: actual PostgreSQL/private MinIO SSR six cards, no duplicate hydration, Load more skeleton/12/18/EOF, same-cursor retry, focus return and six responsive widths pass; poster ' +
      p.posterBytes +
      ' bytes.',
  )
} finally {
  await browser.close()
}
