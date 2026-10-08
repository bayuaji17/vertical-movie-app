import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
const [base, moduleURL, executablePath, api, shots] = process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
const proof = async () => (await fetch(api + '/content-watch-proof')).json()
const control = async (body) => {
  assert.equal(
    (
      await fetch(api + '/control/content-watch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    ).status,
    200,
  )
}
const initial = await proof(),
  errors = [],
  forbidden = [],
  requests = []
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
})
await context.addCookies([
  { name: 'private-sentinel', value: 'must-not-forward', url: base },
])
const posterExpiry = new Map()
let active = 0,
  maxActive = 0,
  failImages = false,
  deadline = 0
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url()),
    owned =
      ['http://127.0.0.1:9000', 'http://localhost:9000'].includes(url.origin) &&
      url.pathname.startsWith('/' + initial.bucket + '/outputs/')
  const publicApi =
    /^\/api\/(videos(?:\/|$)|catalog(?:\/|$)|playback\/videos\/)/.test(
      url.pathname,
    )
  if (
    (!owned && url.origin !== base) ||
    (url.origin === base && url.pathname.startsWith('/api/') && !publicApi)
  ) {
    forbidden.push(url.pathname)
    return route.abort()
  }
  if (owned && failImages && url.pathname.endsWith('poster.webp'))
    return route.abort()
  if (url.origin === base && publicApi)
    requests.push({
      path: url.pathname,
      cursor: url.searchParams.has('cursor'),
    })
  if (/\/api\/videos\/[^/]+\/poster$/.test(url.pathname)) {
    active++
    maxActive = Math.max(active, maxActive)
    try {
      const r = await route.fetch()
      if (r.status() === 200)
        posterExpiry.set(url.pathname, Date.parse((await r.json()).expiresAt))
      await route.fulfill({ response: r })
    } catch {
      await route.abort().catch(() => {})
    } finally {
      active--
    }
    return
  }
  if (/\/api\/videos\/[^/]+\/playback$/.test(url.pathname)) {
    const r = await route.fetch()
    if (r.status() === 200) deadline = Date.parse((await r.json()).expiresAt)
    return route.fulfill({ response: r })
  }
  return route.continue()
})
const page = await context.newPage()
page.setDefaultTimeout(30000)
page.on('pageerror', (e) => errors.push(e.message))
const stage = (name) => console.error('Film catalog browser: ' + name)
const button = (name) => page.getByRole('button', { name, exact: true }),
  link = (name) => page.getByRole('link', { name, exact: true })
const goto = (path, waitUntil = 'networkidle') =>
  page.goto(base + path, { waitUntil })
const cards = () => page.locator('[data-public-card]')
const count = (number) =>
  page.waitForFunction(
    (n) => document.querySelectorAll('[data-public-card]').length === n,
    number,
  )
const signedCount = () =>
  requests.filter((r) => /\/(poster|playback)$/.test(r.path)).length
const playbackCount = () =>
  requests.filter((r) => r.path.endsWith('/playback')).length
const ready = () =>
  page.waitForFunction(
    () => document.querySelector('video')?.readyState >= 2,
    undefined,
    { timeout: 60000 },
  )
const play = async () => {
  await ready()
  assert.equal(await page.locator('video').evaluate((v) => v.autoplay), false)
  await page.locator('button[class~="group/play"]').click()
  await page.waitForFunction(
    () => document.querySelector('video')?.currentTime > 0.3,
  )
}
const appearance = async (name) => {
  await button('Appearance').click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
  await page.waitForFunction(
    (n) => document.documentElement.dataset.themeMode === n,
    name.toLowerCase(),
  )
}
const geometry = async () => {
  const g = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    ratios: [...document.querySelectorAll('[data-public-poster]')].map((e) => {
      const r = e.getBoundingClientRect()
      return Math.abs(r.height - (r.width * 16) / 9)
    }),
    controls: [
      ...document.querySelectorAll(
        'header button,main button,main a[data-slot="button"]',
      ),
    ]
      .filter((e) => e.checkVisibility())
      .map((e) => e.getBoundingClientRect().height),
    nested: document.querySelectorAll('a button,button a,a a').length,
  }))
  assert.equal(g.overflow, false)
  assert.ok(g.ratios.every((v) => v < 1))
  assert.ok(g.controls.every((v) => v >= 43.9))
  assert.equal(g.nested, 0)
}
const shot = async (name) => {
  if (shots) {
    mkdirSync(dirname(shots), { recursive: true })
    await page.screenshot({ path: shots + name + '.png', fullPage: true })
  }
}
try {
  stage('unsigned SSR and failure status')
  for (const path of [
    '/?type=all',
    '/videos/' + initial.movie + '?type=film',
    '/watch/' + initial.movie,
  ]) {
    const r = await fetch(base + path, {
      headers: { cookie: 'private-sentinel=must-not-forward' },
    })
    assert.equal(r.status, 200)
    const html = await r.text()
    assert.ok(
      !/X-Amz-(Signature|Credential)|https?:[^\s"]+poster\.webp/.test(html),
    )
    assert.ok(html.includes('noindex'))
  }
  for (const path of ['/videos/missing', '/videos/' + initial.episodes[0].slug])
    assert.equal((await fetch(base + path)).status, 404)
  await control({ metadataStatus: 503 })
  assert.equal((await fetch(base + '/')).status, 503)
  assert.equal((await fetch(base + '/videos/' + initial.movie)).status, 503)
  await goto('/')
  await button('Retry').waitFor()
  await control({ metadataStatus: 0 })
  await button('Retry').click()
  await count(20)
  // Measure one document before hard navigations create independent browser queues.
  await page.waitForTimeout(500)
  const measuredConcurrency = maxActive
  assert.ok(measuredConcurrency <= 4)
  stage('manual pagination append failure double click and EOF')
  assert.equal(playbackCount(), 0)
  await control({ metadataStatus: 503 })
  await button('Load more').click()
  await page
    .getByText('More videos could not be loaded.', { exact: false })
    .waitFor()
  assert.equal(await cards().count(), 20)
  await control({ metadataStatus: 0 })
  await button('Retry load more').click()
  await count(40)
  assert.equal(
    await cards().evaluateAll(
      (els) => new Set(els.map((e) => e.dataset.videoId)).size,
    ),
    40,
  )
  await button('Load more').evaluate((e) => {
    e.click()
    e.click()
  })
  await count(49)
  await page.getByText('You’re all caught up.', { exact: false }).waitFor()
  stage('filter history scroll back and reload')
  await button('Films').click()
  await page.waitForURL('**/?type=film')
  await count(6)
  await button('Standalone').click()
  await count(20)
  assert.ok(page.url().includes('type=standalone'))
  await button('Load more').click()
  await count(40)
  await page.evaluate(() => scrollTo(0, 700))
  const oldScroll = await page.evaluate(() => scrollY)
  const chosen = await cards().nth(5).locator('a').getAttribute('href')
  await cards().nth(5).locator('a').click()
  await link('Watch now').waitFor()
  assert.equal(playbackCount(), 0)
  await link('Back to browse').click()
  await count(40)
  await page.waitForFunction((y) => Math.abs(scrollY - y) < 3, oldScroll)
  await page.reload()
  await count(20)
  await goto('/?type=wrong')
  await page.waitForURL('**/?type=all')
  await count(20)
  await button('Films').click()
  await count(6)
  await page.goBack()
  await count(20)
  await page.goForward()
  await count(6)
  stage('cancel delayed cursor on filter intent')
  await goto('/?type=all')
  await count(20)
  await control({ holdMore: true })
  await button('Load more').click()
  await page.waitForTimeout(200)
  await button('Films').click()
  await count(6)
  await control({ holdMore: false })
  await page.waitForTimeout(300)
  assert.equal(await cards().count(), 6)
  stage('bounded cover failure and visibility queue')
  await control({ posterStatus: 503 })
  await goto('/?type=all')
  await count(20)
  await button('Retry cover').first().waitFor()
  await page.waitForTimeout(700)
  const firstCount = requests.filter((r) => r.path.endsWith('/poster')).length
  await page.waitForTimeout(700)
  assert.equal(
    requests.filter((r) => r.path.endsWith('/poster')).length,
    firstCount,
  )
  await control({ posterStatus: 0 })
  const repairedId = await button('Retry cover')
    .first()
    .locator('xpath=ancestor::article')
    .getAttribute('data-video-id')
  await button('Retry cover').first().click()
  await page
    .locator('[data-video-id="' + repairedId + '"] [data-public-poster] img')
    .waitFor({ state: 'attached' })
  failImages = true
  await goto('/videos/' + initial.movie)
  await button('Retry cover').waitFor()
  failImages = false
  await button('Retry cover').click()
  await page.locator('[data-public-poster] img').waitFor()
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-public-poster] img')
    return img?.complete && img.naturalWidth > 0
  })
  stage('real cover expiry bounded renewal and explicit recovery')
  const posterPath = '/api/videos/' + initial.movie + '/poster'
  const oldSource = await page
    .locator('[data-public-poster] img')
    .getAttribute('src')
  await page.waitForTimeout(
    Math.max(0, posterExpiry.get(posterPath) - Date.now()) + 200,
  )
  await page.waitForFunction((old) => {
    const image = document.querySelector('[data-public-poster] img')
    return image?.src !== old && image?.complete && image.naturalWidth > 0
  }, oldSource)
  await page.waitForTimeout(
    Math.max(0, posterExpiry.get(posterPath) - Date.now()) + 200,
  )
  await button('Retry cover').waitFor()
  const bounded = signedCount()
  await page.waitForTimeout(700)
  assert.equal(signedCount(), bounded)
  await button('Retry cover').click()
  await page.locator('[data-public-poster] img').waitFor()
  stage('responsive light dark system and mobile detail CTA')
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    for (const mode of ['Light', 'Dark']) {
      await goto('/?type=all')
      await count(20)
      await appearance(mode)
      await geometry()
      await shot('home-' + width + '-' + mode.toLowerCase())
      await goto('/videos/' + initial.movie + '?type=film')
      await link('Watch now').waitFor()
      await geometry()
      if (width < 768)
        assert.ok(
          await link('Watch now').evaluate(
            (e) =>
              e.getBoundingClientRect().top <
              document
                .querySelector('[data-public-poster]')
                .getBoundingClientRect().top,
          ),
        )
      await shot('detail-' + width + '-' + mode.toLowerCase())
    }
  }
  await appearance('System')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark'),
  )
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(
    () => !document.documentElement.classList.contains('dark'),
  )
  stage('keyboard navigation and long copy')
  await goto('/?type=all')
  await count(20)
  await page.waitForLoadState('networkidle')
  await button('Films').focus()
  assert.equal(
    await button('Films').evaluate((e) => e === document.activeElement),
    true,
  )
  await page.keyboard.press('Space')
  await count(6)
  await cards().first().locator('a').focus()
  await page.keyboard.press('Enter')
  await link('Watch now').waitFor()
  await goto('/videos/' + initial.movie + '?type=all')
  await link('Watch now').waitFor()
  assert.equal(
    await page
      .getByText('A complete portrait synopsis. '.repeat(16).trim(), {
        exact: true,
      })
      .count(),
    1,
  )
  // Offline Back uses metadata and route modules retained by the same SPA session.
  await link('Back to browse').click()
  await count(20)
  await cards().first().locator('a').click()
  await link('Watch now').waitFor()
  await page.waitForLoadState('networkidle')
  stage('offline navigation and disabled watch')
  await context.setOffline(true)
  await page.getByText('You are offline.', { exact: true }).waitFor()
  assert.equal(await link('Watch now').getAttribute('aria-disabled'), 'true')
  await link('Back to browse').click()
  await count(20)
  assert.equal(await button('Load more').isDisabled(), true)
  await context.setOffline(false)
  await count(20)
  stage('manual HLS playback seek renewal retry and detail context')
  await goto('/videos/' + initial.standalone + '?type=standalone')
  await link('Watch now').hover()
  const prior = playbackCount()
  await page.waitForTimeout(300)
  assert.equal(playbackCount(), prior)
  await link('Watch now').click()
  await page.waitForURL('**/watch/**?type=standalone')
  await ready()
  assert.equal(await page.locator('video').evaluate((v) => v.paused), true)
  await play()
  await page.locator('video').evaluate((v) => {
    v.pause()
    v.currentTime = 3
  })
  await page.waitForFunction(
    () => document.querySelector('video')?.currentTime >= 2.9,
  )
  await page.waitForTimeout(Math.max(0, deadline - Date.now()) + 250)
  const before = playbackCount()
  await page.locator('video').evaluate((v) => (v.currentTime = 4))
  await page.waitForFunction(
    () => document.querySelector('video')?.readyState >= 2,
  )
  await page.waitForTimeout(1000)
  assert.equal(playbackCount(), before + 1)
  assert.ok(
    await page
      .locator('video')
      .evaluate((v) => v.paused && Math.abs(v.currentTime - 4) < 0.3),
  )
  await page.locator('video').hover()
  await button('Settings').click()
  await page.getByRole('menuitem', { name: /^Quality/ }).click()
  await page.getByRole('menuitemradio', { name: /^480p/ }).click()
  await page.keyboard.press('Escape')
  await page.locator('video').evaluate((v) => (v.currentTime = 7))
  await play()
  await page.waitForFunction(
    () => document.querySelector('video')?.videoWidth === 486,
  )
  await link('Back to details').click()
  assert.ok(
    page.url().includes('/videos/' + initial.standalone + '?type=standalone'),
  )
  assert.equal(await page.locator('video').count(), 0)
  await control({ playbackStatus: 503 })
  await goto('/watch/' + initial.movie + '?type=film')
  await button('Retry playback').waitFor()
  await control({ playbackStatus: 0 })
  await button('Retry playback').click()
  await play()
  await link('Back to browse').click()
  await count(6)
  stage('episode compatibility manual Next identity reset')
  const boundary = initial.episodes.findIndex((e) => e.season === 2),
    prev = initial.episodes[boundary - 1],
    next = initial.episodes[boundary]
  await goto('/watch/' + prev.slug)
  await ready()
  await page
    .getByRole('link', { name: 'Next episode · S2 E1', exact: true })
    .click()
  await page.waitForURL((url) => url.pathname === '/watch/' + next.slug)
  await ready()
  assert.equal(await page.locator('video').count(), 1)
  assert.equal(await page.locator('video').evaluate((v) => v.currentTime), 0)
  await link('Back to series').click()
  await page.getByRole('heading', { name: 'Series 1', exact: true }).waitFor()
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        'section[aria-label="Episodes"] a[href^="/watch/"]',
      ).length === 20,
  )
  stage('held capability identity race')
  await control({ holdPlayback: true })
  await goto('/watch/' + prev.slug, 'domcontentloaded')
  await page
    .getByRole('link', { name: 'Next episode · S2 E1', exact: true })
    .click()
  await page.waitForURL((url) => url.pathname === '/watch/' + next.slug)
  await control({ holdPlayback: false })
  await ready()
  assert.equal(await page.locator('video').count(), 1)
  assert.equal(await page.locator('video').evaluate((v) => v.currentTime), 0)
  stage('archive visibility and actual empty film result')
  const id = initial.movie.slice('movie-'.length)
  await control({ archive: id })
  assert.equal((await fetch(base + '/videos/' + initial.movie)).status, 404)
  await control({ archiveFilms: true })
  await goto('/?type=film')
  await page.getByText('No videos in this category', { exact: true }).waitFor()
  await control({ restore: true })
  const result = await proof()
  assert.equal(result.authReads, 0)
  assert.ok(result.traces.every((t) => !t.cookie && !t.authorization))
  assert.deepEqual(forbidden, [])
  assert.deepEqual(errors, [])
  console.log(
    'Browser: Film/Standalone SSR, paging, history, covers, responsive themes, offline, real HLS renewal/retry, episode Next and archive passed; max poster concurrency ' +
      measuredConcurrency +
      '.',
  )
} catch (error) {
  await shot('failure')
  console.error(
    'Browser diagnostic: ' +
      JSON.stringify({
        url: new URL(page.url()).pathname + new URL(page.url()).search,
        message: (
          await page
            .locator('main')
            .innerText({ timeout: 1000 })
            .catch(() => '[no main]')
        ).slice(0, 600),
        errors,
        requests: requests.slice(-12),
        covers: await page.locator('[data-public-poster]').count(),
        images: await page.locator('[data-public-poster] img').count(),
      }),
  )
  throw error
} finally {
  await browser.close()
}
