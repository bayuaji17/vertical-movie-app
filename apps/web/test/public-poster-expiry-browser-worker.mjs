import assert from 'node:assert/strict'
// Usage: bun public-poster-expiry-browser-worker.mjs <base> <playwright module URL> <chromium path|""> <state.json> <screenshot dir> [--baseline] [--real-wait]
// Needs the stack from `scripts/browser-proof.sh up --public` (a published, playable film with a real cover).
//
// Default: proves a displayed poster is never lost, however long the page is left open
// (a fake clock jumps ahead hours at a time; the server keeps real time).
// --baseline: records what the code does today without asserting success (POSTER-002).
// --real-wait: also waits past the real lifetime of the first presigned URL and checks storage rejects it.
const [base, moduleURL, executablePath, stateFile, shots, ...flags] =
  process.argv.slice(2)
const baseline = flags.includes('--baseline'),
  realWait = flags.includes('--real-wait')
const { chromium } = await import(moduleURL)
const state = await Bun.file(stateFile).json()
const slug = state.ids.public.slug
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
})
const errors = []
const results = []
const ok = (name) => (results.push(name), console.log('ok -', name))
const note = (name) => console.log('note -', name)
const hour = 3_600_000

async function open(viewport, path) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const requests = []
  page.on('request', (r) => {
    const u = r.url()
    if (/\/poster(\.webp)?(\?|$)/.test(u) || /\/playback(\?|$)/.test(u))
      requests.push({
        at: Date.now(),
        url: u.replace(/\?.*/, '') + (u.includes('?') ? '?…' : ''),
      })
  })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /hydration|Minified React error/i.test(m.text())
    )
      errors.push(m.text())
  })
  await page.clock.install()
  await page.goto(base + path, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  return { context, page, requests }
}
// What the viewer sees where the poster should be.
const posterState = (page) =>
  page.evaluate(() => {
    const frame = document.querySelector('[data-public-poster]')
    const img = frame?.querySelector('img')
    return {
      frame: !!frame,
      img: !!img,
      loaded: !!img && img.complete && img.naturalWidth > 0,
      expires: img ? new URL(img.src).searchParams.get('X-Amz-Expires') : null,
      unavailable: /Cover unavailable/.test(frame?.textContent ?? ''),
      skeleton: !!frame?.querySelector('[data-slot="skeleton"]'),
    }
  })
const waitLoaded = (page) =>
  page.waitForFunction(
    () => {
      const img = document.querySelector('[data-public-poster] img')
      return !!img && img.complete && img.naturalWidth > 0
    },
    null,
    { timeout: 60000 },
  )

try {
  // 1. detail page poster
  const { context, page, requests } = await open(
    { width: 1280, height: 900 },
    `/videos/${slug}`,
  )
  await waitLoaded(page)
  const first = await posterState(page)
  note(`first poster: loaded=${first.loaded}, X-Amz-Expires=${first.expires}`)
  await page.screenshot({ path: `${shots}/poster-0-initial.png` })
  assert.ok(first.loaded)
  if (!baseline) {
    // The poster URL lives a day (not 2 x the 60 s video), the video URL an hour.
    assert.equal(first.expires, '86400')
    const playback = await (
      await fetch(`http://localhost:3301/videos/${slug}/playback`)
    ).json()
    const hls = Date.parse(playback.expiresAt) - Date.now()
    assert.ok(hls > 3_590_000 && hls <= 3_600_000, `HLS lifetime ${hls}`)
    assert.equal(
      new URL(playback.posterUrl).searchParams.get('X-Amz-Expires'),
      '86400',
    )
    ok(
      'poster URL lifetime is 24 h and the HLS lifetime is 1 h for a 60 s video',
    )
  }

  const seen = []
  const lifetime = Number(first.expires) * 1000
  // Jump ahead in steps of a bit more than one lifetime (baseline) or hours (fixed).
  const steps = baseline ? 4 : 12
  const jump = baseline ? lifetime + 30_000 : 2.5 * hour
  for (let i = 1; i <= steps; i++) {
    await page.clock.fastForward(jump)
    await page.waitForTimeout(1200)
    const s = await posterState(page)
    seen.push(s)
    note(
      `after +${((i * jump) / hour).toFixed(2)} h: img=${s.img} loaded=${s.loaded} unavailable=${s.unavailable} skeleton=${s.skeleton}`,
    )
    if (!baseline)
      assert.ok(
        s.loaded,
        `poster must stay loaded after +${((i * jump) / hour).toFixed(2)} h`,
      )
  }
  await page.screenshot({ path: `${shots}/poster-1-after-idle.png` })
  note(`poster requests while idle (API + image fetches): ${requests.length}`)
  if (baseline) {
    const lost = seen.some((s) => !s.loaded)
    note(`baseline: poster was lost at some point = ${lost}`)
    ok(`baseline recorded (lost=${lost})`)
  } else {
    assert.ok(seen.every((s) => s.loaded))
    ok(
      `detail poster stayed loaded across ${((steps * jump) / hour).toFixed(0)} h of idle time (${requests.length} poster requests, API and image)`,
    )
    // Never a blank/skeleton/unavailable frame at any sampled moment.
    assert.ok(seen.every((s) => !s.unavailable && !s.skeleton))
    ok('no "Cover unavailable" or skeleton state at any sampled moment')
  }

  // 2. the player poster
  const watch = await open({ width: 390, height: 844 }, `/watch/${slug}`)
  await watch.page.waitForFunction(
    () => document.querySelector('video')?.poster,
    null,
    { timeout: 60000 },
  )
  const poster0 = await watch.page.evaluate(
    () => document.querySelector('video').poster,
  )
  const expires0 = new URL(poster0).searchParams.get('X-Amz-Expires')
  if (!baseline) assert.equal(expires0, '86400')
  note(`player poster X-Amz-Expires=${expires0}`)
  const urls = new Set([poster0])
  for (let i = 0; i < 4; i++) {
    await watch.page.clock.fastForward(
      baseline ? lifetime + 30_000 : 2.5 * hour,
    )
    await watch.page.waitForTimeout(1000)
    urls.add(
      await watch.page.evaluate(
        () => document.querySelector('video')?.poster ?? '',
      ),
    )
  }
  note(`distinct player poster URLs over the idle period: ${urls.size}`)
  await watch.page.screenshot({ path: `${shots}/poster-2-player.png` })
  if (!baseline) {
    assert.ok(
      [...urls].every(Boolean),
      'the player poster attribute never becomes empty',
    )
    assert.equal(urls.size, 1, 'the player poster does not change while idle')
    ok('player poster stayed the same and never became empty while idle')
  }
  await watch.context.close()

  // 3. what storage really does with the first URL once its lifetime has passed
  if (realWait) {
    const url = (
      await (await fetch(`http://localhost:3301/videos/${slug}/poster`)).json()
    ).posterUrl
    const ttl = Number(new URL(url).searchParams.get('X-Amz-Expires'))
    note(`waiting ${ttl + 5} real seconds for the presigned URL to expire…`)
    assert.equal((await fetch(url)).status, 200)
    await Bun.sleep((ttl + 5) * 1000)
    const status = (await fetch(url)).status
    note(`old URL after expiry → HTTP ${status}`)
    if (baseline) ok(`real expiry confirmed (HTTP ${status})`)
  }
  if (!baseline) {
    // 4. offline for a long time, then back online: the poster stays, then renews quietly
    const before = requests.length
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.clock.fastForward(30 * hour)
    await page.waitForTimeout(800)
    assert.ok((await posterState(page)).loaded, 'poster stays while offline')
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await page.clock.fastForward(1000)
    await page.waitForTimeout(1500)
    const back = await posterState(page)
    assert.ok(back.loaded && !back.unavailable && !back.skeleton)
    assert.ok(
      requests.length > before,
      'a new URL was requested after coming back online',
    )
    ok('offline for 30 h: poster stays; back online it renews quietly')

    // 5. tab hidden for a long time, then shown again
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.clock.fastForward(30 * hour)
    await page.waitForTimeout(500)
    assert.ok(
      (await posterState(page)).loaded,
      'poster stays while the tab is hidden',
    )
    const hiddenRequests = requests.length
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    })
    await page.waitForTimeout(1500)
    const shown = await posterState(page)
    assert.ok(shown.loaded && !shown.unavailable && !shown.skeleton)
    note(`requests while hidden→visible: ${requests.length - hiddenRequests}`)
    ok('tab hidden for 30 h then shown: poster never blank')
  }
  await context.close()

  if (!baseline) {
    // 6. mobile
    const mobile = await open({ width: 390, height: 844 }, `/videos/${slug}`)
    await waitLoaded(mobile.page)
    for (let i = 0; i < 6; i++) {
      await mobile.page.clock.fastForward(5 * hour)
      await mobile.page.waitForTimeout(700)
      assert.ok((await posterState(mobile.page)).loaded)
    }
    assert.ok(
      await mobile.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    await mobile.page.screenshot({ path: `${shots}/poster-3-mobile.png` })
    ok(
      'mobile 390 px: poster stays across 30 h of idle time, no horizontal scroll',
    )
    await mobile.context.close()
  }

  if (!baseline) {
    assert.deepEqual(errors, [], errors.join('\n'))
    ok('no page errors or hydration warnings')
  }
  console.log(JSON.stringify({ passed: results.length, baseline }))
} finally {
  await browser.close()
}
