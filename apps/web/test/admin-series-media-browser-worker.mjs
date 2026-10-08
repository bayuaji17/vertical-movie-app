import assert from 'node:assert/strict'
import { win32 } from 'node:path'
const [baseURL, moduleURL, executablePath, controlURL, screenshotPrefix] =
  process.argv.slice(2)
const { chromium } = await import(moduleURL),
  browser = await chromium.launch({ headless: true, executablePath })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
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
  page.on('pageerror', (e) => errors.push(e.message))
  const proof = async () =>
    await (await fetch(controlURL + '/media-proof?objects=1')).json()
  const info = await proof(),
    { ids, files } = info
  const disk = (p) =>
    process.platform === 'win32'
      ? win32.join(
          '\\\\wsl.localhost',
          process.env.WSL_DISTRO_NAME ?? 'Debian',
          p,
        )
      : p
  const detail =
    '/admin/series/' + ids.seriesDraft + '/episodes/' + ids.episodeDraft
  const enabled = async (locator) => {
    await locator.waitFor()
    for (let i = 0; i < 400; i++) {
      if (await locator.isEnabled()) return
      await page.waitForTimeout(50)
    }
    assert.fail('Action unavailable: ' + (await locator.textContent()))
  }
  await page.goto(baseURL + detail, { waitUntil: 'networkidle' })
  await page
    .getByRole('heading', { name: 'Media Episode', exact: true })
    .waitFor()
  const inventory = await (
    await page.request.get(
      baseURL + '/api/admin/media/owners/video/' + ids.episodeDraft,
    )
  ).json()
  assert.equal(inventory.config.maxDurationSeconds, 600)
  assert.equal(Number(inventory.config.source.maxBytes), 512000000)
  const source = page.locator('[data-media-kind="source"]')
  await source.locator('input[type=file]').setInputFiles({
    name: 'invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not video'),
  })
  await source
    .getByText(/Choose a supported format/)
    .first()
    .waitFor()
  for (const kind of ['source', 'poster']) {
    const card = page.locator('[data-media-kind="' + kind + '"]')
    await card.locator('input[type=file]').setInputFiles(disk(files[kind]))
    if (kind === 'poster') {
      const crop = page.getByRole('dialog')
      await crop.waitFor()
      await enabled(crop.getByRole('button', { name: 'Use crop', exact: true }))
      await crop.getByRole('button', { name: 'Use crop', exact: true }).click()
      await crop.waitFor({ state: 'hidden' })
    }
    const upload = card.getByRole('button', {
      name: 'Upload file',
      exact: true,
    })
    await enabled(upload)
    await upload.click()
    await card
      .getByText(kind === 'poster' ? 'Ready' : 'Upload completed', {
        exact: true,
      })
      .waitFor({ timeout: 45000 })
  }
  const worker = await fetch(controlURL + '/control/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ runJobs: true }),
  })
  assert.ok(worker.ok)
  await page.getByRole('button', { name: 'Refresh media', exact: true }).click()
  const preview = page.getByText('Preview video', { exact: true })
  await preview.waitFor({ timeout: 30000 })
  await preview.click()
  await page.waitForURL(/type=episode/)
  await page.waitForFunction(
    () => document.querySelector('video')?.readyState >= 2,
  )
  await page.locator('button[class~="group/play"]').click()
  await page.waitForFunction(
    () => document.querySelector('video')?.currentTime > 0,
  )
  assert.equal(
    await page.evaluate(() => document.querySelector('video').paused),
    false,
  )
  await page.getByText('Back to episode', { exact: true }).click()
  await page.waitForURL(baseURL + detail)
  const verified = await proof(),
    assets = verified.assets.filter((a) => a.owner_id === ids.episodeDraft),
    sourceAsset = assets.find((a) => a.kind === 'source'),
    poster = assets.find((a) => a.kind === 'poster')
  assert.equal(sourceAsset.state, 'ready')
  assert.ok(sourceAsset.verified_ready_at)
  assert.ok(poster.verified_ready_at)
  assert.ok(
    verified.jobs.some(
      (j) => j.asset_id === sourceAsset.id && j.state === 'succeeded',
    ),
  )
  const cover = verified.posterObjects.find(
    (o) => o.ownerId === ids.episodeDraft,
  )
  assert.deepEqual(cover.dimensions, [1080, 1920])
  assert.equal(cover.unsignedStatus, 403)
  const row = verified.publications.find((r) => r.id === ids.episodeDraft)
  assert.equal(row.publication_status, 'draft')
  assert.equal(row.row_version, 3)
  const readiness = await (
    await page.request.get(
      baseURL +
        '/api/admin/videos/' +
        ids.episodeDraft +
        '/publication-readiness',
    )
  ).json()
  assert.equal(readiness.canPublish, true)
  if (screenshotPrefix)
    await page.screenshot({
      path: screenshotPrefix + 'episode-media-390.png',
      fullPage: true,
    })
  assert.deepEqual(errors, [])
  console.log(
    'Browser: Series episode real upload/crop, 600s/512MB policy, invalid file, FFmpeg verified HLS playback, correct preview Back, unchanged draft metadata and private cover passed.',
  )
  await context.close()
} finally {
  await browser.close()
}
