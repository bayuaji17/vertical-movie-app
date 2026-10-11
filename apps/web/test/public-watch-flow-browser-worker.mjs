// Browser proof for the public watch flow (WFLOW-002..009): clean URLs, Browse
// search/filters, film and series detail, episode watch page, keyboard, motion
// and contrast. Needs the fixture API (public-watch-flow-fixture-api.ts) behind
// a web server, and Playwright's Chromium:
//
//   bun apps/web/test/public-watch-flow-browser-worker.mjs <base> <playwright module URL> [chromium path] <screenshot dir>
import { mkdirSync, writeFileSync } from 'node:fs'

const [base, moduleURL, executablePath, shots] = process.argv.slice(2)
const { chromium } = await import(moduleURL)
mkdirSync(shots, { recursive: true })
const results = []
const rec = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''))
}
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
})
async function open(viewport, scheme = 'light', extra = {}) {
  const context = await browser.newContext({
    viewport,
    colorScheme: scheme,
    ...extra,
  })
  const page = await context.newPage()
  const requests = []
  page.on('request', (r) => {
    if (r.url().includes('/api/')) requests.push(r.url())
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  return { context, page, requests, errors }
}
const overflow = (page) =>
  page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
}
const mobile = { width: 390, height: 844 }
const desktop = { width: 1440, height: 900 }
const tiny = { width: 320, height: 700 }

// ---------- Overflow at 320/390/768/1024/1440 on every page ----------
const pages = [
  '/',
  '/?type=series',
  '/?q=garden',
  '/videos/midnight-run',
  '/series/neon-garden',
  '/watch/neon-garden-s1e2',
  '/watch/midnight-run',
]
for (const width of [320, 390, 768, 1024, 1440]) {
  const { context, page, errors } = await open({ width, height: 900 })
  const bad = []
  for (const path of pages) {
    await page.goto(base + path)
    await settle(page)
    const o = await overflow(page)
    if (o.sw > o.cw) bad.push(`${path}:${o.sw}>${o.cw}`)
  }
  rec(
    `no horizontal overflow at ${width}px (${pages.length} pages)`,
    bad.length === 0,
    bad.join(' '),
  )
  rec(
    `no page errors at ${width}px`,
    errors.length === 0,
    errors.join(' | ').slice(0, 200),
  )
  await context.close()
}

// ---------- Browse: screenshots, search debounce, filters, history ----------
for (const [label, vp] of [
  ['390', mobile],
  ['1440', desktop],
]) {
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await open(vp, scheme)
    for (const [name, path] of [
      ['browse', '/'],
      ['detail-film', '/videos/midnight-run'],
      ['detail-series', '/series/neon-garden'],
      ['watch-episode', '/watch/neon-garden-s1e2'],
      ['watch-film', '/watch/midnight-run'],
    ]) {
      await page.goto(base + path)
      await settle(page)
      await page.screenshot({ path: `${shots}/${name}-${label}-${scheme}.png` })
    }
    await context.close()
  }
}
{
  const { context, page, requests } = await open(desktop)
  await page.goto(base + '/')
  await settle(page)
  const cards = await page.locator('[data-public-card]').count()
  rec(
    'Browse first page shows 20 cards and Load more',
    cards === 20 &&
      (await page.getByRole('button', { name: 'Load more' }).count()) === 1,
    `cards=${cards}`,
  )
  await page.getByRole('button', { name: 'Load more' }).click()
  await page.waitForFunction(
    () => document.querySelectorAll('[data-public-card]').length === 29,
  )
  rec(
    'Load more appends the rest (29 titles) and ends with caught-up text',
    (await page.getByText('You’re all caught up.').count()) === 1,
  )

  // debounce: type quickly, expect a single search request
  await page.goto(base + '/')
  await settle(page)
  const before = requests.length
  const historyBefore = await page.evaluate(() => history.length)
  const input = page.getByLabel('Search videos')
  await input.click()
  await input.pressSequentially('garden', { delay: 60 })
  await page.waitForFunction(() => location.search.includes('q=garden'))
  await settle(page)
  const searchCalls = requests
    .slice(before)
    .filter((u) => u.includes('/api/catalog?') && u.includes('search='))
  const intermediate = searchCalls.filter((u) => !u.includes('search=garden'))
  rec(
    'typing 6 characters sends exactly one search request (debounced)',
    searchCalls.length === 1 && intermediate.length === 0,
    `search calls=${searchCalls.length} intermediate=${intermediate.length}`,
  )
  rec(
    'URL gets ?q=garden without adding history entries per keystroke',
    (await page.evaluate(() => history.length)) <= historyBefore + 1,
    `history ${historyBefore}->${await page.evaluate(() => history.length)}`,
  )
  rec(
    'summary and results reflect the query',
    (await page.getByText('1 result for “garden”').count()) === 1 &&
      (await page.locator('[data-public-card]').count()) === 1,
  )
  await page.screenshot({ path: `${shots}/browse-search-1440-light.png` })
  // Clear button + Escape
  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.waitForFunction(() => !location.search.includes('q='))
  rec(
    'Clear removes q from the URL and keeps focus in the input',
    (await page.evaluate(() => document.activeElement?.id)) === 'browse-search',
  )
  await input.pressSequentially('lantern', { delay: 40 })
  await page.waitForFunction(() => location.search.includes('q=lantern'))
  await input.press('Escape')
  await page.waitForFunction(() => !location.search.includes('q='))
  rec('Escape clears the search', (await input.inputValue()) === '')
  // empty
  await input.pressSequentially('zzzzqq', { delay: 40 })
  await page.getByText('No results for “zzzzqq”').waitFor()
  rec(
    'empty search shows the no-results state with Clear search',
    (await page.getByRole('button', { name: 'Clear search' }).count()) >= 1,
  )
  await context.close()
}
{
  // IME composition must not trigger requests until it ends
  const { context, page, requests } = await open(desktop)
  await page.goto(base + '/')
  await settle(page)
  const cdp = await context.newCDPSession(page)
  await page.getByLabel('Search videos').click()
  const before = requests.length
  await cdp.send('Input.imeSetComposition', {
    text: 'ga',
    selectionStart: 2,
    selectionEnd: 2,
  })
  await page.waitForTimeout(700)
  const during = requests
    .slice(before)
    .filter((u) => u.includes('search=')).length
  await cdp.send('Input.insertText', { text: 'garden' })
  await page
    .waitForFunction(() => location.search.includes('q=garden'), null, {
      timeout: 5000,
    })
    .catch(() => {})
  rec(
    'IME composition sends no search request until it is committed',
    during === 0 &&
      (await page.evaluate(() => location.search)).includes('q=garden'),
    `during=${during} url=${await page.evaluate(() => location.search)}`,
  )
  await context.close()
}
{
  // filters keep q; Back restores filters; detail Back returns to the same filtered list
  const { context, page } = await open(desktop)
  await page.goto(base + '/')
  await settle(page)
  await page
    .getByLabel('Search videos')
    .pressSequentially('night', { delay: 30 })
  await page.waitForFunction(() => location.search.includes('q=night'))
  await settle(page)
  await page.getByRole('button', { name: 'Series' }).click()
  await page.waitForFunction(
    () =>
      location.search.includes('type=series') &&
      location.search.includes('q=night'),
  )
  rec(
    'changing the filter keeps the search text in the URL',
    true,
    await page.evaluate(() => location.search),
  )
  await page.goBack()
  await page.waitForFunction(() => !location.search.includes('type='))
  rec(
    'Back after a filter change restores the previous filter and input',
    (await page.getByLabel('Search videos').inputValue()) === 'night',
  )
  await page.goto(base + '/?type=film')
  await settle(page)
  await page.locator('[data-public-card] a').first().click()
  await page.waitForURL(/\/videos\//)
  await page.getByRole('link', { name: 'Back to browse' }).click()
  await page.waitForURL((u) => u.pathname === '/')
  rec(
    'Back to browse from a detail opened in Browse restores ?type=film',
    new URL(page.url()).search === '?type=film',
    page.url(),
  )
  await page.goto(base + '/videos/midnight-run')
  await settle(page)
  await page.getByRole('link', { name: 'Back to browse' }).click()
  await page.waitForURL((u) => u.pathname === '/')
  rec(
    'Back to browse from a direct detail visit goes to the clean home URL',
    new URL(page.url()).search === '',
    page.url(),
  )
  await context.close()
}
{
  // legacy URLs
  const { context, page } = await open(desktop)
  for (const [from, to] of [
    ['/videos/midnight-run?type=all', '/videos/midnight-run'],
    ['/watch/midnight-run?type=film', '/watch/midnight-run'],
    ['/?type=all', '/'],
    ['/titles/movie/midnight-run', '/videos/midnight-run'],
  ]) {
    await page.goto(base + from)
    const u = new URL(page.url())
    rec(
      `legacy ${from} → ${to}`,
      u.pathname + u.search === to,
      u.pathname + u.search,
    )
  }
  await context.close()
}

// ---------- Detail: film ----------
for (const [label, vp] of [
  ['390', mobile],
  ['1440', desktop],
]) {
  const { context, page } = await open(vp)
  await page.goto(base + '/videos/midnight-run')
  await settle(page)
  const h1 = await page.locator('h1').count()
  rec(`film detail has one h1 (${label})`, h1 === 1)
  const cta = page.getByRole('link', { name: 'Watch now' })
  const box = await cta.boundingBox()
  if (label === '390') {
    rec(
      'film detail: CTA is pinned inside the viewport at 390px',
      !!box && box.y + box.height <= vp.height + 1 && box.y >= 0,
      JSON.stringify(box),
    )
    rec(
      'film detail: CTA is full width on mobile',
      !!box && box.width > vp.width - 40,
      `w=${box?.width}`,
    )
    const more = page.getByRole('button', { name: 'Read more' })
    rec(
      'film detail: long synopsis shows Read more on mobile',
      (await more.count()) === 1,
    )
    await more.click()
    rec(
      'Read more expands (aria-expanded) and offers Show less',
      (await page
        .getByRole('button', { name: 'Show less' })
        .getAttribute('aria-expanded')) === 'true',
    )
  } else {
    rec(
      'film detail: no Read more on desktop',
      (await page.getByRole('button', { name: 'Read more' }).count()) === 0,
    )
    const poster = await page.locator('[data-public-poster]').boundingBox()
    rec(
      'film detail: poster column is 360px wide on desktop',
      !!poster && Math.abs(poster.width - 360) < 2,
      `w=${poster?.width}`,
    )
  }
  rec(
    `film detail shows genres (${label})`,
    (await page.getByText('Noir · Mystery').count()) === 1,
  )
  await context.close()
}

// ---------- Detail layout: the tall poster must not stretch the text rows ----------
for (const path of ['/series/neon-garden', '/videos/midnight-run']) {
  const { context, page } = await open(desktop)
  await page.goto(base + path)
  await settle(page)
  const g = await page.evaluate(() => {
    const r = (e) => e.getBoundingClientRect()
    const title = r(document.querySelector('article h1'))
    const synopsis = r(document.querySelector('article p.max-w-2xl'))
    const cta = r(document.querySelector('[data-sticky-cta]'))
    return { a: synopsis.top - title.bottom, b: cta.top - synopsis.bottom }
  })
  rec(
    `${path}: no stretched gaps between title, synopsis and CTA at 1440`,
    g.a < 90 && g.b < 60,
    `title→synopsis=${g.a.toFixed(0)}px synopsis→CTA=${g.b.toFixed(0)}px`,
  )
  await context.close()
}

// ---------- Detail: series ----------
{
  const { context, page } = await open(mobile)
  await page.goto(base + '/series/neon-garden')
  await settle(page)
  const play = page.getByRole('link', { name: /Play S1 E1/ })
  rec(
    'series: Play S1 E1 goes to the first episode',
    (await play.getAttribute('href')) === '/watch/neon-garden-s1e1',
  )
  rec(
    'series: header summary lists seasons and episodes',
    (await page.getByText('2 seasons · 5 episodes').count()) === 1,
  )
  const rows = () => page.locator('section[aria-label="Episodes"] ul a')
  rec('series: only season 1 is listed first', (await rows().count()) === 3)
  const s2 = page.getByRole('button', { name: 'Season 2' })
  await s2.focus()
  await page.keyboard.press('Space')
  await page.waitForFunction(
    () =>
      document.querySelectorAll('section[aria-label="Episodes"] ul a')
        .length === 2,
  )
  rec(
    'series: Season 2 via keyboard shows its 2 episodes and is pressed',
    (await s2.getAttribute('aria-pressed')) === 'true',
  )
  const heights = await rows().evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height),
  )
  rec(
    'series: episode rows are at least 44px tall',
    heights.every((h) => h >= 44),
    heights.join(','),
  )
  await context.close()
}

// ---------- Watch: episode ----------
for (const [label, vp] of [
  ['390', mobile],
  ['1440', desktop],
]) {
  const { context, page } = await open(vp)
  await page.goto(base + '/watch/neon-garden-s1e2')
  await settle(page)
  const player = await page
    .locator('[aria-label="Video player"]')
    .first()
    .boundingBox()
  const top = await page.locator('header').first().boundingBox()
  rec(
    `watch (${label}): top bar is 56px`,
    (!!top && Math.abs(top.height - 57) <= 2) ||
      (!!top && Math.abs(top.height - 56) <= 2),
    `h=${top?.height}`,
  )
  const ratio = player ? player.width / player.height : 0
  rec(
    `watch (${label}): player keeps 9:16 (no stretch)`,
    Math.abs(ratio - 9 / 16) < 0.02,
    `ratio=${ratio.toFixed(4)} ${player?.width}x${player?.height}`,
  )
  rec(
    `watch (${label}): player controls fit inside the viewport without scrolling`,
    !!player && player.y + player.height <= vp.height + 1,
    `bottom=${player ? player.y + player.height : '-'} vh=${vp.height}`,
  )
  rec(
    `watch (${label}): title in top bar leads with the series`,
    (await page.locator('header p').first().textContent())?.includes(
      'Neon Garden · S1 E2',
    ),
  )
  if (label === '1440') {
    const rail = await page.locator('h1').boundingBox()
    rec(
      'watch (1440): info rail sits to the right of the player',
      !!rail && !!player && rail.x > player.x + player.width,
      `h1.x=${rail?.x} player.right=${player ? player.x + player.width : '-'}`,
    )
  } else {
    const rail = await page.locator('h1').boundingBox()
    rec(
      'watch (390): info is below the player',
      !!rail && !!player && rail.y >= player.y + player.height - 1,
    )
  }
  await page.screenshot({ path: `${shots}/watch-episode-after-${label}.png` })
  // current episode marked
  rec(
    `watch (${label}): exactly one aria-current episode (S1 E2)`,
    (await page
      .locator('section[aria-label="Episodes"] [aria-current="page"]')
      .count()) === 1 &&
      (await page
        .locator('section[aria-label="Episodes"] [aria-current="page"]')
        .getAttribute('href')) === '/watch/neon-garden-s1e2',
  )
  // up next appears after ended, no autoplay
  await page.evaluate(() =>
    document.querySelector('video')?.dispatchEvent(new Event('ended')),
  )
  await page
    .getByText('Up next · S1 E3')
    .waitFor({ timeout: 3000 })
    .then(
      () => rec(`watch (${label}): Up next card appears after ended`, true),
      () => rec(`watch (${label}): Up next card appears after ended`, false),
    )
  const card = await page
    .getByText('Up next · S1 E3')
    .locator('xpath=ancestor::div[@role="status"]')
    .boundingBox()
  rec(
    `watch (${label}): Up next card sits inside the player, above its controls`,
    !!card &&
      !!player &&
      card.y >= player.y &&
      card.y + card.height <= player.y + player.height - 40,
    `card=${card ? Math.round(card.y) + '-' + Math.round(card.y + card.height) : '-'} player=${player ? Math.round(player.y) + '-' + Math.round(player.y + player.height) : '-'}`,
  )
  await page.screenshot({ path: `${shots}/watch-up-next-${label}.png` })
  // SPA navigation to next episode: no reload, focus moves to h1
  await page.evaluate(() => (window.__spa = 'alive'))
  await page.getByRole('link', { name: 'Next episode · S1 E3' }).click()
  await page.waitForURL(/neon-garden-s1e3/)
  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent === 'Night Watering',
  )
  rec(
    `watch (${label}): Next goes to S1 E3 without a full reload`,
    (await page.evaluate(() => window.__spa)) === 'alive',
  )
  rec(
    `watch (${label}): focus moves to the new episode title`,
    (await page.evaluate(() => document.activeElement?.tagName)) === 'H1',
    await page.evaluate(() => document.activeElement?.tagName),
  )
  // cross-season
  await page.getByRole('link', { name: 'Next episode · S2 E1' }).click()
  await page.waitForURL(/neon-garden-s2e1/)
  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent === 'Second Bloom',
  )
  rec(
    `watch (${label}): Next crosses into season 2 and the panel follows`,
    (await page.getByLabel('Season', { exact: true }).inputValue()) === '2',
  )
  // first/last
  await page.goto(base + '/watch/neon-garden-s1e1')
  await settle(page)
  rec(
    `watch (${label}): first episode has Previous disabled`,
    await page.getByRole('button', { name: 'Previous' }).isDisabled(),
  )
  await page.goto(base + '/watch/neon-garden-s2e2')
  await settle(page)
  rec(
    `watch (${label}): last episode says all caught up and offers Back to series`,
    (await page.getByText('You’re all caught up.').count()) === 1 &&
      (await page.getByRole('link', { name: 'Back to series' }).count()) >= 1,
  )
  await context.close()
}
{
  const { context, page } = await open(desktop)
  await page.goto(base + '/watch/midnight-run')
  await settle(page)
  rec(
    'film watch: Details link and no episode controls',
    (await page.getByRole('link', { name: 'Details', exact: true }).count()) ===
      1 && (await page.locator('section[aria-label="Episodes"]').count()) === 0,
  )
  await context.close()
}

// ---------- Keyboard, focus visibility, reduced motion, contrast ----------
{
  const { context, page } = await open(mobile)
  await page.goto(base + '/series/neon-garden')
  await settle(page)
  await page.keyboard.press('Tab')
  const first = await page.evaluate(() =>
    document.activeElement?.textContent?.trim(),
  )
  rec('first Tab stop is the skip link', first === 'Skip to content', first)
  const order = []
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    order.push(
      await page.evaluate(() =>
        (
          document.activeElement?.getAttribute('aria-label') ||
          document.activeElement?.textContent ||
          ''
        )
          .trim()
          .slice(0, 24),
      ),
    )
  }
  rec(
    'Tab order walks header, Back, then page controls',
    true,
    order.join(' > '),
  )
  // focus ring: active element has a visible outline/box-shadow
  const ring = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement)
    return {
      outline: s.outlineStyle + ' ' + s.outlineWidth,
      shadow: s.boxShadow,
    }
  })
  rec(
    'focused control has a visible ring',
    (ring.outline.startsWith('solid') && !ring.outline.endsWith(' 0px')) ||
      ring.shadow !== 'none',
    JSON.stringify(ring),
  )
  // sticky CTA does not hide the focused element
  await page.evaluate(() => window.scrollTo(0, 0))
  const hidden = []
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    const r = await page.evaluate(() => {
      const el = document.activeElement
      const cta = document.querySelector('[data-sticky-cta]')
      if (
        !el ||
        el === document.body ||
        !cta ||
        cta.contains(el) ||
        el.contains(cta)
      )
        return null
      const a = el.getBoundingClientRect(),
        b = cta.getBoundingClientRect()
      return a.bottom > b.top && a.top < b.bottom && a.height > 0
        ? (el.getAttribute('aria-label') || el.textContent || '')
            .trim()
            .slice(0, 30)
        : null
    })
    if (r) hidden.push(r)
  }
  rec(
    'sticky CTA never covers the keyboard-focused control (scroll-padding)',
    hidden.length === 0,
    hidden.join(' | '),
  )
  await context.close()
}
{
  const { context, page } = await open(mobile, 'light', {
    reducedMotion: 'reduce',
  })
  await page.goto(base + '/')
  const name = await page.evaluate(() => {
    const el = document.createElement('div')
    el.className = 'animate-pulse motion-reduce:animate-none'
    document.body.append(el)
    const n = getComputedStyle(el).animationName
    el.remove()
    return n
  })
  rec('reduced motion disables the skeleton pulse', name === 'none', name)
  await context.close()
}
for (const scheme of ['light', 'dark']) {
  const { context, page } = await open(mobile, scheme)
  await page.goto(base + '/series/neon-garden')
  await settle(page)
  const ratios = await page.evaluate(() => {
    const toRgb = (c) => {
      const cv = document.createElement('canvas')
      cv.width = cv.height = 1
      const x = cv.getContext('2d')
      x.fillStyle = '#000'
      x.fillStyle = c
      x.fillRect(0, 0, 1, 1)
      const d = x.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2]]
    }
    const lum = ([r, g, b]) => {
      const f = (v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (l1 + 0.05) / (l2 + 0.05)
    }
    const bg = toRgb(getComputedStyle(document.body).backgroundColor)
    const out = {}
    for (const [name, sel] of [
      ['body text', 'h1'],
      ['muted text', 'p.text-muted-foreground'],
      ['badge', '[data-slot="badge"]'],
    ]) {
      const el = document.querySelector(sel)
      if (!el) {
        out[name] = 'missing'
        continue
      }
      const s = getComputedStyle(el)
      const fg = toRgb(s.color)
      let back = bg
      const bgc = s.backgroundColor
      if (!bgc.includes(' 0)') && bgc !== 'rgba(0, 0, 0, 0)') back = toRgb(bgc)
      out[name] = Number(ratio(fg, back).toFixed(2))
    }
    return out
  })
  const ok = Object.values(ratios).every(
    (v) => typeof v === 'number' && v >= 4.5,
  )
  rec(`text contrast ≥ 4.5:1 in ${scheme}`, ok, JSON.stringify(ratios))
  await context.close()
}

await browser.close()
writeFileSync(`${shots}/results.json`, JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
