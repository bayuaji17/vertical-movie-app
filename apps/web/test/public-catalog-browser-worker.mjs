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
const button = (name) => page.getByRole('button', { name, exact: true })
const search = () => page.getByRole('searchbox', { name: 'Search titles' })
const restart = async (flags = {}) => {
  await control({
    restore: true,
    catalogStatus: 0,
    genresStatus: 0,
    featuredStatus: 0,
    posterStatus: 0,
    holdNext: false,
    holdSearch: '',
    ...flags,
  })
  await page.reload({ waitUntil: 'networkidle' })
}
const latestQuery = () => new URLSearchParams(metaRequests().at(-1)?.query)
const waitQuery = async (key, value) => {
  for (let i = 0; i < 100 && latestQuery().get(key) !== value; i++)
    await page.waitForTimeout(50)
  assert.equal(latestQuery().get(key), value)
  await page.waitForLoadState('networkidle')
}
const appearance = async (name) => {
  await button('Appearance').click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
  await page.waitForFunction(
    (mode) => document.documentElement.dataset.themeMode === mode,
    name.toLowerCase(),
  )
}
const layoutProof = async (width) => {
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    ratios: [...document.querySelectorAll('[data-poster-frame]')].map((e) => {
      const r = e.getBoundingClientRect()
      return Math.abs(r.height - (r.width * 16) / 9)
    }),
  }))
  assert.equal(layout.overflow, false, 'No horizontal overflow at ' + width)
  assert.ok(layout.ratios.every((v) => v < 1))
}
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
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await control({ holdNext: true })
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await page.locator('[data-catalog-skeleton]').first().waitFor()
  assert.equal(await cards().count(), 6)
  assert.equal(await page.locator('[data-catalog-skeleton]').count(), 6)
  assert.equal(
    await page.locator('[data-catalog-grid]').getAttribute('aria-busy'),
    'true',
  )
  assert.ok(
    await page
      .locator('[data-catalog-skeleton] [data-slot="skeleton"]')
      .evaluateAll(
        (nodes) =>
          nodes.length > 0 &&
          nodes.every((n) => getComputedStyle(n).animationName === 'none'),
      ),
  )
  assert.ok(
    await page
      .getByRole('button', { name: 'Loading more', exact: true })
      .isDisabled(),
  )
  await control({ holdNext: false })
  await count(12)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
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
  // Every type and a combined genre filter go through the real API.
  for (const [name, kind] of [
    ['Film', 'movie'],
    ['Series', 'series'],
    ['Standalone', 'standalone'],
  ]) {
    await button(name).click()
    await waitQuery('kind', kind)
    await count(6)
    assert.ok(
      (
        await cards().evaluateAll((nodes) =>
          nodes.map((n) => n.dataset.catalogId),
        )
      ).every((id) => id.startsWith(kind + ':')),
    )
  }
  await button('Film').click()
  await waitQuery('kind', 'movie')
  const ids = (await proof()).ids
  await page
    .getByRole('combobox', { name: 'Genre', exact: true })
    .selectOption(ids.genres[0])
  await waitQuery('genreId', ids.genres[0])
  await count(2)
  await page
    .getByRole('combobox', { name: 'Genre', exact: true })
    .selectOption('all')
  await count(6)
  await button('All').click()
  await waitQuery('kind', null)
  await search().pressSequentially('Rain', { delay: 50 })
  const beforeDebounce = metaRequests().length
  await page.waitForTimeout(100)
  assert.equal(
    metaRequests().length,
    beforeDebounce,
    'No search before the debounce deadline',
  )
  await waitQuery('search', 'rain')
  await count(1)
  assert.equal(await search().inputValue(), 'Rain')
  assert.equal(metaRequests().length, beforeDebounce + 1)
  await search().fill('% _ \\ 🎬')
  await waitQuery('search', '% _ \\ 🎬')
  await count(1)
  await restart()
  const beforeIME = metaRequests().length
  await search().dispatchEvent('compositionstart')
  await search().fill('Rain')
  await page.waitForTimeout(400)
  assert.equal(
    metaRequests().length,
    beforeIME,
    'IME composition does not search intermediate text',
  )
  await search().dispatchEvent('compositionend', { data: 'Rain' })
  await waitQuery('search', 'rain')
  await count(1)
  await restart()
  await control({ holdSearch: 'rain' })
  const raceTraceStart = (await proof()).traces.length
  await search().fill('rain')
  let heldSearchStarted = false
  for (let i = 0; i < 100; i++) {
    if (
      (await proof()).traces
        .slice(raceTraceStart)
        .some((t) => new URLSearchParams(t.query).get('search') === 'rain')
    ) {
      heldSearchStarted = true
      break
    }
    await page.waitForTimeout(50)
  }
  assert.ok(
    heldSearchStarted,
    'Old search is in flight before the newer search',
  )
  await count(0)
  assert.equal(await page.locator('[data-catalog-skeleton]').count(), 6)
  await search().fill('film')
  await waitQuery('search', 'film')
  await count(5)
  await control({ holdSearch: '' })
  await page.waitForTimeout(100)
  await count(5)
  assert.ok(
    (await cards().allTextContents()).every((text) => text.includes('Film')),
    'A late old search cannot replace the newer filter',
  )

  await restart({ catalogStatus: 503 })
  await count(0)
  await page
    .getByText('Catalog is temporarily unavailable', { exact: true })
    .waitFor()
  assert.equal(
    await page.getByText('No titles found', { exact: true }).count(),
    0,
  )
  await control({ catalogStatus: 0 })
  await button('Retry catalog').click()
  await count(6)
  await restart({ genresStatus: 503, featuredStatus: 503 })
  await count(6)
  await button('Retry genres').waitFor()
  await button('Retry featured film').waitFor()
  assert.equal(await page.locator('#catalog-genre option').count(), 1)
  await control({ genresStatus: 0, featuredStatus: 0 })
  await button('Retry genres').click()
  await page.waitForFunction(
    () => document.querySelectorAll('#catalog-genre option').length === 3,
  )
  await button('Retry featured film').click()
  await page.locator('[aria-label="Featured film"]').waitFor()
  await control({ catalogStatus: 503 })
  await button('Refresh catalog').click()
  await button('Retry refresh').waitFor()
  await count(6)
  await control({ catalogStatus: 0 })
  await button('Retry refresh').click()
  await button('Retry refresh').waitFor({ state: 'hidden' })
  await count(6)
  await control({ catalogStatus: 422 })
  await button('Load more').click()
  await page
    .getByText('Catalog changed. Refresh to continue.', { exact: true })
    .waitFor()
  assert.equal(await button('Load more').count(), 0)
  await count(6)
  await control({ catalogStatus: 0 })
  await button('Refresh catalog').click()
  await button('Load more').waitFor()
  await count(6)
  assert.equal(
    latestQuery().has('cursor'),
    false,
    '422 refresh restarts page one',
  )

  await restart({ empty: true })
  await count(0)
  await page.getByText('No titles found', { exact: true }).waitFor()
  assert.equal(await page.locator('[aria-label="Featured film"]').count(), 0)
  await restart({ seriesOnly: true })
  await count(6)
  assert.equal(await page.locator('[aria-label="Featured film"]').count(), 0)
  assert.equal(
    await button('Retry featured film').count(),
    0,
    'Null featured is a valid result',
  )
  await restart({ posterStatus: 503 })
  await count(6)
  for (const image of await page.locator('[data-poster-frame] img').all())
    await image.scrollIntoViewIfNeeded()
  await page.waitForLoadState('networkidle')
  assert.ok(
    await page
      .locator('[data-poster-frame] img')
      .evaluateAll((images) =>
        images.every(
          (img) =>
            img.complete && img.naturalWidth > 0 && img.src.endsWith('.svg'),
        ),
      ),
  )
  const posterFailures = posterResponses.length
  await page.waitForTimeout(400)
  assert.equal(
    posterResponses.length,
    posterFailures,
    'Poster fallback has no retry loop',
  )
  await restart()
  await count(6)
  const firstId = await cards().first().getAttribute('data-catalog-id')
  const [firstKind, firstUUID] = firstId.split(':')
  await control({ archive: { kind: firstKind, id: firstUUID } })
  assert.equal(
    await page.evaluate(
      async (path) => (await fetch(path)).status,
      '/api/catalog/' + firstKind + '/' + firstUUID + '/poster',
    ),
    404,
  )
  await button('Load more').click()
  await count(12)
  await button('Load more').click()
  await count(18)
  await page.getByText('18 titles shown', { exact: true }).waitFor()
  await button('Refresh catalog').click()
  await count(17)
  assert.ok(
    !(
      await cards().evaluateAll((nodes) =>
        nodes.map((n) => n.dataset.catalogId),
      )
    ).includes(firstId),
  )
  await restart()
  await count(6)
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await button('Load more').click()
  await page.getByText(/Waiting for a connection/).waitFor()
  await count(6)
  assert.ok(await button('Load more').isDisabled())
  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await count(12)
  await restart({ title: 'PortraitStory'.repeat(14) })
  await count(6)
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    await layoutProof(width)
  }
  await restart()
  await count(6)
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileTrigger = button('Open navigation')
  await mobileTrigger.click()
  await page
    .getByRole('dialog', { name: 'Vertical Movie', exact: true })
    .waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.waitForFunction(
    (node) => document.activeElement === node,
    await mobileTrigger.elementHandle(),
  )
  await appearance('System')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark'),
  )
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(
    () => !document.documentElement.classList.contains('dark'),
  )
  for (const theme of ['Light', 'Dark']) {
    await appearance(theme)
    for (const [width, height] of [
      [320, 800],
      [390, 844],
      [768, 1024],
      [1024, 900],
      [1440, 1000],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height })
      await layoutProof(width)
      if (screenshotPrefix && (width === 390 || width === 1440)) {
        for (const image of await page
          .locator('[data-poster-frame] img')
          .all()) {
          await image.scrollIntoViewIfNeeded()
          await image.evaluate((element) => element.decode())
        }
        await page.evaluate(() => window.scrollTo(0, 0))
        const path =
          screenshotPrefix + width + '-' + theme.toLowerCase() + '.png'
        mkdirSync(dirname(path), { recursive: true })
        await page.screenshot({ path, fullPage: true })
      }
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
    'Browser: actual PostgreSQL/private MinIO SSR six cards, hydration, manual paging/retry/422, types/genres/literal search/debounce/IME/latest-search race, partial/outage/empty/null featured, fallback/fresh archive/count refresh/offline, keyboard/mobile focus/reduced motion, long titles and six widths Light/Dark/System pass; poster ' +
      p.posterBytes +
      ' bytes.',
  )
} finally {
  await browser.close()
}
