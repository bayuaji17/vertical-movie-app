import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [baseURL, moduleURL, executablePath, apiOrigin, screenshotPrefix] =
  process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
let stage = 'setup'
let captureCapability = false
let capabilityDeadline = 0
const enterStage = (value) => {
  stage = value
  console.error('Public content browser: ' + value)
}
const proof = async () =>
  (await fetch(apiOrigin + '/content-watch-proof')).json()
const control = async (body) => {
  const r = await fetch(apiOrigin + '/control/content-watch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.equal(r.status, 200)
}
const initial = await proof(),
  requests = [],
  forbidden = [],
  errors = []
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
})
const origin = new URL(baseURL).origin
await context.addCookies([
  { name: 'private-sentinel', value: 'must-not-forward', url: baseURL },
])
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url())
  const ownedStorage =
    url.origin === 'http://127.0.0.1:9000' &&
    url.pathname.startsWith('/' + initial.bucket + '/outputs/')
  const publicApi =
    /^\/api\/(catalog(?:\/|$)|videos\/[a-z0-9-]+\/(playback|next)$|playback\/videos\/)/.test(
      url.pathname,
    )
  if (
    (!ownedStorage && url.origin !== origin) ||
    (url.origin === origin && /^\/api(?:\/|$)/.test(url.pathname) && !publicApi)
  ) {
    forbidden.push(url.pathname)
    return route.abort()
  }
  if (url.origin === origin && url.pathname.startsWith('/api/'))
    requests.push({
      path: url.pathname,
      cursor: url.searchParams.get('cursor'),
    })
  if (
    captureCapability &&
    /\/api\/videos\/[^/]+\/playback$/.test(url.pathname)
  ) {
    captureCapability = false
    const response = await route.fetch()
    assert.equal(response.status(), 200)
    const info = await response.json()
    capabilityDeadline = Date.parse(info.expiresAt)
    return route.fulfill({ response })
  }
  return route.continue()
})
const page = await context.newPage()
page.setDefaultTimeout(30000)
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (
    message.type() === 'error' &&
    /hydration|React error|Invalid hook/i.test(message.text())
  )
    errors.push(message.text())
})
const button = (name) => page.getByRole('button', { name, exact: true })
const link = (name) => page.getByRole('link', { name, exact: true })
const rows = () =>
  page.locator('section[aria-label="Episodes"] a[href^="/watch/"]')
const waitRows = (n) =>
  page.waitForFunction(
    (n) =>
      document.querySelectorAll(
        'section[aria-label="Episodes"] a[href^="/watch/"]',
      ).length === n,
    n,
  )
const capabilityCount = () =>
  requests.filter((r) => /\/videos\/[^/]+\/playback$/.test(r.path)).length
const reset = async () =>
  control({
    restore: true,
    metadataStatus: 0,
    episodesStatus: 0,
    nextStatus: 0,
    playbackStatus: 0,
    holdMore: false,
    holdPlayback: false,
    clearTraces: true,
  })
const goto = async (path) => {
  await page.goto(baseURL + path, { waitUntil: 'networkidle' })
}
const readyVideo = () =>
  page.waitForFunction(
    () => document.querySelector('video')?.readyState >= 2,
    undefined,
    { timeout: 60000 },
  )
const play = async () => {
  await readyVideo()
  assert.equal(await page.locator('video').evaluate((v) => v.autoplay), false)
  await page.locator('button[class~="group/play"]').click()
  await page.waitForFunction(
    () => document.querySelector('video')?.currentTime > 0.3,
  )
}
const screenshot = async (name) => {
  if (screenshotPrefix) {
    mkdirSync(dirname(screenshotPrefix), { recursive: true })
    await page.screenshot({
      path: screenshotPrefix + name + '.png',
      fullPage: true,
    })
  }
}
const appearance = async (name) => {
  await button('Appearance').click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
  await page.waitForFunction(
    (mode) => document.documentElement.dataset.themeMode === mode,
    name.toLowerCase(),
  )
}
const geometry = async () => {
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    posters: [...document.querySelectorAll('[data-poster-frame]')].map((e) => {
      const r = e.getBoundingClientRect()
      return Math.abs(r.height - (r.width * 16) / 9)
    }),
    navigation: [
      ...document.querySelectorAll(
        'main a[data-slot="button"], header:has(nav[aria-label="Main navigation"]) button, section[aria-label="Episodes"] a',
      ),
    ]
      .filter(
        (e) =>
          e.checkVisibility() &&
          e.getBoundingClientRect().width &&
          e.getBoundingClientRect().height,
      )
      .map((e) => ({
        name: e.getAttribute('aria-label') ?? e.textContent.trim(),
        height: e.getBoundingClientRect().height,
      })),
    video: document.querySelector('video')
      ? (() => {
          const r = document.querySelector('video').getBoundingClientRect()
          return Math.abs(r.height - (r.width * 16) / 9)
        })()
      : 0,
  }))
  assert.equal(result.overflow, false)
  assert.ok(result.posters.every((v) => v < 1))
  assert.ok(
    result.navigation.every((v) => v.height >= 43.5),
    JSON.stringify(result.navigation),
  )
  assert.ok(result.video < 1)
}
try {
  enterStage('unsigned-ssr-hydration')
  await reset()
  const seriesPath = '/series/' + initial.series
  const html = await (await fetch(baseURL + seriesPath)).text()
  assert.equal((html.match(/href="\/watch\/episode-/g) ?? []).length, 20)
  assert.ok(html.includes('Season 1'))
  for (const value of [
    apiOrigin,
    'X-Amz-Signature',
    'S3_SECRET_ACCESS_KEY',
    'DATABASE_URL',
    'masterUrl',
    'posterUrl',
  ])
    assert.ok(!html.includes(value))
  requests.length = 0
  await goto(seriesPath)
  await waitRows(20)
  assert.equal(
    requests.filter((r) =>
      /^\/api\/catalog\/(?:details\/(?:movie|standalone|series)\/[^/]+|series\/[^/]+\/episodes)$/.test(
        r.path,
      ),
    ).length,
    0,
    'Hydration must reuse unsigned SSR pages',
  )
  assert.equal(capabilityCount(), 0)
  await rows().first().hover()
  await page.waitForTimeout(250)
  assert.equal(capabilityCount(), 0)

  enterStage('episode-append-skeleton')
  await control({ holdMore: true })
  await button('Load more episodes').click()
  await page
    .getByRole('status', { name: 'Loading more episodes', exact: true })
    .waitFor()
  assert.equal(await rows().count(), 20)
  assert.equal(
    await page
      .getByRole('status', { name: 'Loading more episodes' })
      .locator('[data-slot="skeleton"]')
      .count(),
    4,
  )
  await control({ holdMore: false })
  await waitRows(24)
  assert.equal(await button('Load more episodes').count(), 0)
  assert.ok(
    (await rows().allTextContents()).every((text) =>
      /Season \d+ · Episode \d+/.test(text),
    ),
  )

  enterStage('failed-append-same-cursor')
  await goto(seriesPath)
  await control({ episodesStatus: 503 })
  await button('Load more episodes').click()
  await button('Retry episodes').waitFor()
  assert.equal(await rows().count(), 20)
  const failedCursor = requests.filter((r) => r.cursor).at(-1).cursor
  await control({ episodesStatus: 0 })
  await button('Retry episodes').click()
  await waitRows(24)
  assert.equal(requests.filter((r) => r.cursor).at(-1).cursor, failedCursor)
  await goto(seriesPath)
  await control({ episodesStatus: 422 })
  await button('Load more episodes').click()
  await button('Refresh episodes').waitFor()
  await control({ episodesStatus: 0 })
  const before = requests.length
  await button('Refresh episodes').click()
  await waitRows(20)
  await page.waitForLoadState('networkidle')
  assert.ok(
    requests
      .slice(before)
      .some((r) => r.path.endsWith('/episodes') && !r.cursor),
    '422 must restart at the first page',
  )

  enterStage('partial-episodes-and-offline')
  await control({ episodesStatus: 503 })
  const partial = await page.goto(baseURL + seriesPath, {
    waitUntil: 'networkidle',
  })
  assert.equal(partial.status(), 200)
  await button('Retry episodes').waitFor()
  assert.equal(await rows().count(), 0)
  assert.notEqual(
    await page.getByRole('heading', { level: 1 }).textContent(),
    'Title unavailable',
  )
  await control({ episodesStatus: 0 })
  await button('Retry episodes').click()
  await waitRows(20)
  await context.setOffline(true)
  await page.waitForFunction(() => !navigator.onLine)
  await button('Load more episodes').click()
  await page
    .getByText('Connection paused. Episodes will resume when you are online.', {
      exact: true,
    })
    .waitFor()
  assert.equal(await rows().count(), 20)
  await context.setOffline(false)
  await waitRows(24)

  enterStage('dialog-links-and-focus')
  await goto('/')
  await button('View details').click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  assert.ok(
    (
      await dialog
        .getByRole('link', { name: 'Open details' })
        .getAttribute('href')
    ).startsWith('/titles/movie/'),
  )
  assert.ok(
    (
      await dialog.getByRole('link', { name: 'Watch now' }).getAttribute('href')
    ).startsWith('/watch/'),
  )
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  await page.waitForFunction(
    (trigger) => document.activeElement === trigger,
    await button('View details').elementHandle(),
  )
  assert.equal(
    await button('View details').evaluate((e) => e === document.activeElement),
    true,
  )
  await link('View film').hover()
  const noPlaybackBefore = capabilityCount()
  await page.waitForTimeout(250)
  assert.equal(capabilityCount(), noPlaybackBefore)
  await button('View details').click()
  await dialog.getByRole('link', { name: 'Open details' }).click()
  await page.getByRole('heading', { level: 1 }).waitFor()
  await link('Watch now').click()
  await page.waitForURL(/\/watch\//)
  await play()
  await link('Back to details').click()
  await page.getByRole('heading', { level: 1 }).waitFor()
  assert.equal(await page.locator('video').count(), 0)

  await goto('/')
  await button('Series').click()
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll('[data-catalog-card]')]
    return (
      cards.length > 0 &&
      cards.every((card) => card.dataset.catalogId.startsWith('series:'))
    )
  })
  const seriesCard = page
    .locator('[data-catalog-card]')
    .first()
    .getByRole('button')
  await seriesCard.focus()
  await page.keyboard.press('Enter')
  await dialog.waitFor()
  assert.equal(
    await dialog
      .getByRole('link', { name: 'Open details' })
      .getAttribute('href'),
    seriesPath,
  )
  assert.equal(await dialog.getByRole('link', { name: 'Watch now' }).count(), 0)
  await dialog.getByRole('link', { name: 'Open details' }).click()
  await waitRows(20)

  enterStage('standalone-detail-watch')
  await goto('/titles/standalone/' + initial.standalone)
  captureCapability = true
  await link('Watch now').click()
  await play()
  await screenshot('standalone-watch-light')
  await page.locator('video').evaluate((v) => {
    v.pause()
    v.currentTime = 3
  })
  await page.waitForFunction(
    () => document.querySelector('video')?.currentTime >= 2.9,
  )
  await page.waitForTimeout(Math.max(0, capabilityDeadline - Date.now()) + 250)
  const renewalBefore = capabilityCount()
  const renewed = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname ===
      '/api/videos/' + initial.standalone + '/playback',
  )
  await page.locator('video').evaluate((v) => {
    v.currentTime = 4
  })
  assert.equal((await renewed).status(), 200)
  await page.waitForLoadState('networkidle')
  await readyVideo()
  assert.equal(capabilityCount() - renewalBefore, 1)
  assert.ok(
    await page
      .locator('video')
      .evaluate((v) => v.paused && Math.abs(v.currentTime - 4) < 0.2),
  )
  await page.locator('video').hover()
  await button('Settings').click()
  await page.getByRole('menuitem', { name: /^Quality/ }).click()
  const quality = page.getByRole('menuitemradio', { name: /^480p/ })
  await quality.click()
  await page.keyboard.press('Escape')
  await page.locator('video').evaluate((v) => {
    v.currentTime = 7
  })
  await play()
  await page.waitForFunction(
    // The existing 480p ladder is 486x864 for exact portrait ratio and even dimensions.
    () => document.querySelector('video')?.videoWidth === 486,
  )

  enterStage('cross-season-manual-next')
  const boundary = initial.episodes.findIndex((e) => e.season === 2)
  const previous = initial.episodes[boundary - 1],
    next = initial.episodes[boundary]
  await goto('/watch/' + previous.slug)
  await readyVideo()
  assert.equal(await page.locator('video').evaluate((v) => v.currentTime), 0)
  await page
    .getByRole('link', { name: 'Next episode · S2 E1', exact: true })
    .waitFor()
  assert.ok(page.url().endsWith(previous.slug))
  await page
    .getByRole('link', { name: 'Next episode · S2 E1', exact: true })
    .click()
  await page.waitForURL('**/watch/' + next.slug)
  await page
    .getByRole('heading', { level: 1, name: next.title, exact: true })
    .waitFor()
  await readyVideo()
  assert.equal(await page.locator('video').evaluate((v) => v.currentTime), 0)
  await play()
  await link('Back to series').click()
  await waitRows(20)

  enterStage('next-error-and-eof')
  await control({ nextStatus: 503 })
  await goto('/watch/' + previous.slug)
  await button('Retry next episode').waitFor()
  await control({ nextStatus: 0 })
  await button('Retry next episode').click()
  await page.getByRole('link', { name: 'Next episode · S2 E1' }).waitFor()
  await goto('/watch/' + initial.episodes.at(-1).slug)
  await page
    .getByText('No more episodes are currently available.', { exact: true })
    .waitFor()
  await play()
  const current = page.url()
  await page.locator('video').evaluate((v) => {
    v.currentTime = v.duration - 0.1
  })
  await page.waitForFunction(() => document.querySelector('video')?.ended)
  assert.equal(page.url(), current)

  enterStage('explicit-playback-retry')
  await control({ playbackStatus: 503 })
  const failuresBefore = capabilityCount()
  await goto('/watch/' + initial.movie)
  await button('Retry video').waitFor()
  await page.waitForTimeout(500)
  assert.equal(capabilityCount() - failuresBefore, 1)
  await control({ playbackStatus: 0 })
  await button('Retry video').click()
  await play()

  enterStage('identity-race')
  await control({ holdPlayback: true })
  await page.goto(baseURL + '/watch/' + previous.slug, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByRole('link', { name: 'Next episode · S2 E1' }).waitFor()
  await page.getByRole('link', { name: 'Next episode · S2 E1' }).click()
  await page.waitForURL('**/watch/' + next.slug)
  await control({ holdPlayback: false })
  await page
    .getByRole('heading', { level: 1, name: next.title, exact: true })
    .waitFor()
  await readyVideo()
  assert.equal(await page.locator('video').count(), 1)
  assert.equal(await page.locator('video').evaluate((v) => v.currentTime), 0)

  enterStage('resource-errors-and-archive')
  for (const path of [
    '/titles/movie/missing-title',
    '/titles/episode/' + initial.movie,
    '/series/missing-series',
    '/watch/missing-video',
  ]) {
    const response = await page.goto(baseURL + path)
    assert.equal(response.status(), 404, path)
    await page
      .getByRole('heading', { name: 'Title unavailable', exact: true })
      .waitFor()
    assert.equal(await page.locator('video').count(), 0)
  }
  await control({ metadataStatus: 503 })
  const unavailable = await page.goto(baseURL + '/watch/' + initial.movie, {
    waitUntil: 'networkidle',
  })
  assert.equal(unavailable.status(), 503)
  await button('Retry title').waitFor()
  await control({ metadataStatus: 0 })
  await button('Retry title').click()
  await readyVideo()
  await control({ archive: initial.movie.slice('movie-'.length) })
  const denied = await page.request.get(
    baseURL + '/api/videos/' + initial.movie + '/playback',
  )
  assert.equal(denied.status(), 404)
  await page.reload()
  await page
    .getByRole('heading', { name: 'Title unavailable', exact: true })
    .waitFor()
  await reset()

  enterStage('responsive-theme-matrix')
  let cases = 0
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['Light', 'Dark', 'System']) {
      console.error('Public content browser matrix: ' + width + ' ' + theme)
      await goto(seriesPath)
      await appearance(theme)
      await waitRows(20)
      await geometry()
      if (width === 390 && theme === 'Dark') await screenshot('series-390-dark')
      await goto('/watch/' + initial.movie)
      await readyVideo()
      await geometry()
      if (width === 390 && theme === 'Dark') await screenshot('watch-390-dark')
      cases++
    }
  }
  const final = await proof()
  assert.equal(final.authReads, 0)
  assert.ok(final.traces.every((t) => !t.cookie && !t.authorization))
  assert.deepEqual(forbidden, [])
  assert.deepEqual(errors, [])
  console.log(
    'Browser: all public kinds detail/watch, unsigned SSR hydration, 20/24 episode skeleton and cursor retries, manual cross-season Next/EOF/error, real private HLS play, identity cancellation, explicit retry/archive, no auth or leaked credentials, and ' +
      cases +
      ' theme/viewport cases passed.',
  )
} catch (error) {
  console.error('Public content browser stage: ' + stage)
  console.error(
    JSON.stringify({
      errors,
      metadataRequests: requests
        .filter((r) =>
          /^\/api\/catalog\/(?:details|watch)\/|\/episodes$/.test(r.path),
        )
        .map((r) => ({ path: r.path, hasCursor: !!r.cursor })),
    }),
  )
  throw error
} finally {
  await browser.close()
}
