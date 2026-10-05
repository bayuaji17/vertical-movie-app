import assert from 'node:assert/strict'
import { win32 } from 'node:path'
import { readFile } from 'node:fs/promises'

const [baseURL, moduleURL, executablePath, controlURL, _screenshots, phase] =
  process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
let stage = 'layout'
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
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
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('dialog', (dialog) => dialog.accept())
  const proof = async () =>
    await (await fetch(controlURL + '/media-proof')).json()
  const mediaControl = async (input) => {
    const result = await fetch(controlURL + '/control/media', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    assert.ok(result.ok)
  }
  const control = async (input) =>
    fetch(controlURL + '/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  const data = await proof(),
    path = (type, state = 'Draft') =>
      baseURL + '/admin/content/' + type + '/' + data.ids[type + state]
  const disk = (file) =>
    process.platform === 'win32'
      ? win32.join(
          '\\\\wsl.localhost',
          process.env.WSL_DISTRO_NAME ?? 'Debian',
          file,
        )
      : file
  const card = (kind) => page.locator(`[data-media-kind="${kind}"]`)
  const theme = async (mode) => {
    await page
      .getByRole('button', { name: 'Account menu', exact: true })
      .click()
    await page.getByRole('menuitemradio', { name: mode, exact: true }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('menu').waitFor({ state: 'hidden' })
  }
  for (const type of phase === 'outage'
    ? []
    : ['film', 'standalone', 'series']) {
    await page.goto(path(type))
    await page
      .getByRole('heading', { name: 'Upload media', exact: true })
      .waitFor()
    await card('poster').waitFor()
    assert.equal(await card('source').count(), type === 'series' ? 0 : 1)
    for (const mode of ['Light', 'Dark', 'System']) {
      await theme(mode)
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        const overflow = await page.evaluate(() =>
          Array.from(document.querySelectorAll('body *'))
            .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
            .slice(-8)
            .map((el) => ({
              tag: el.tagName,
              slot: el.getAttribute('data-slot'),
              text: el.textContent.slice(0, 90),
              width: Math.round(el.getBoundingClientRect().width),
            })),
        )
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${type}/${mode}/${width} overflow: ${JSON.stringify(overflow)}`,
        )
      }
    }
    for (const state of ['Published', 'Archived']) {
      await page.goto(path(type, state))
      await card('poster').waitFor()
      assert.equal(
        await page
          .getByRole('button', { name: 'Choose file', exact: true })
          .count(),
        0,
      )
      assert.equal(
        await page
          .getByRole('button', { name: 'Upload file', exact: true })
          .count(),
        0,
      )
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  if (phase !== 'outage') await theme('Light')
  if (phase === 'outage') {
    await page.goto(path('standalone'))
    await mediaControl({ failureStatus: 503 })
    await card('source').waitFor()
    await card('source')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.source))
    await card('source')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    await card('source')
      .getByText('Check upload status', { exact: true })
      .waitFor()
    await mediaControl({ failureStatus: 0 })
    await card('source')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    await card('source')
      .getByText('Upload completed', { exact: true })
      .waitFor()
    console.log('Browser: outage recovery passed')
  } else if (phase === 'layout') {
    assert.deepEqual(errors, [])
    console.log(
      'Browser: media layout — three kinds, draft/published/archived, 45 light/dark/system viewport checks passed',
    )
  } else {
    stage = 'resume'
    await page.goto(path('film'))
    await card('source').waitFor()
    assert.ok(
      data.files.sourceSize > 5242880,
      'Multipart fixture must include two or more parts',
    )
    let hold = true,
      held = false,
      release
    await context.route('**localhost:9000/**', async (route) => {
      const url = new URL(route.request().url())
      if (
        hold &&
        route.request().method() === 'PUT' &&
        Number(url.searchParams.get('partNumber')) >= 2
      ) {
        held = true
        await new Promise((r) => (release = r))
      }
      await route.continue().catch(() => {})
    })
    await card('source')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.source))
    await card('source')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    await page.waitForFunction(() =>
      document
        .querySelector('[data-media-kind="source"]')
        ?.textContent.includes('Uploading'),
    )
    for (let i = 0; i < 100 && !held; i++)
      await new Promise((r) => setTimeout(r, 50))
    assert.ok(held, 'Second part must be held in flight')
    await card('source')
      .getByRole('button', { name: 'Pause', exact: true })
      .click()
    release?.()
    hold = false
    await page.reload()
    await card('source')
      .getByText('Select the same file to resume', { exact: true })
      .waitFor()
    const before = (await proof()).traces.filter((t) =>
      t.path.endsWith('/parts'),
    ).length
    const original = await readFile(disk(data.files.source)),
      wrong = Buffer.from(original)
    wrong[wrong.length - 1] ^= 1
    await card('source').locator('input[type=file]').setInputFiles({
      name: 'source.mp4',
      mimeType: 'video/mp4',
      buffer: wrong,
    })
    await card('source')
      .getByRole('button', { name: 'Resume upload', exact: true })
      .click()
    await card('source')
      .getByText(
        'Select the same file to resume. Its contents must match the original file.',
        { exact: true },
      )
      .waitFor()
    assert.equal(
      (await proof()).traces.filter((t) => t.path.endsWith('/parts')).length,
      before,
    )
    await card('source')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.source))
    await card('source')
      .getByRole('button', { name: 'Resume upload', exact: true })
      .click()
    await card('source')
      .getByText('Upload completed', { exact: true })
      .waitFor({ timeout: 30000 })
    assert.equal(await page.locator('a[href*="/preview"]').count(), 0)
    stage = 'processing'
    await card('poster')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.poster))
    const coverPreview = await card('poster')
      .getByAltText('Selected cover preview')
      .getAttribute('src')
    assert.ok(coverPreview?.startsWith('blob:'))
    await theme('Dark')
    await theme('Light')
    assert.equal(
      await card('poster')
        .getByAltText('Selected cover preview')
        .getAttribute('src'),
      coverPreview,
    )
    await card('poster')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    await card('poster')
      .getByText('Upload completed', { exact: true })
      .waitFor({ timeout: 30000 })
    assert.equal(await page.locator('a[href*="/preview"]').count(), 0)
    await mediaControl({ runJobs: true })
    await page
      .getByRole('button', { name: 'Refresh media', exact: true })
      .click()
    await card('source')
      .getByText('Ready', { exact: true })
      .waitFor({ timeout: 30000 })
    await card('poster')
      .getByText('Ready', { exact: true })
      .waitFor({ timeout: 30000 })
    await page.locator('a[href*="/preview"]').waitFor()
    const verified = await proof(),
      session = verified.sessions.find(
        (s) =>
          s.owner_id === data.ids.filmDraft &&
          s.kind === 'source' &&
          s.status === 'completed',
      )
    assert.ok(session)
    assert.equal(session.expected_sha256, verified.sourceSha256)
    assert.equal(
      verified.assets.find((a) => a.id === session.asset_id)?.sha256,
      verified.sourceSha256,
    )
    assert.equal(
      verified.jobs.filter((j) => j.asset_id === session.asset_id).length,
      1,
    )
    const replay = await page.request.post(
      baseURL + '/api/admin/media/uploads/' + session.id + '/complete',
    )
    assert.equal(replay.status(), 200)
    assert.equal(
      (await proof()).jobs.filter((j) => j.asset_id === session.asset_id)
        .length,
      1,
    )
    const shot = (name) =>
      disk(
        data.files.source.replace(/browser-[^/]+\/source\.mp4$/, name + '.png'),
      )
    await page.screenshot({
      path: shot('admin-upload-desktop-light'),
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 1000 })
    await theme('Dark')
    await page.screenshot({
      path: shot('admin-upload-mobile-dark'),
      fullPage: true,
    })
    await theme('Light')
    await page.setViewportSize({ width: 1440, height: 1000 })
    stage = 'version-conflict'
    const edit = await context.newPage()
    await edit.goto(path('film') + '/edit')
    await edit
      .getByLabel('Title *', { exact: true })
      .fill('Retained dirty metadata')
    await page.goto(path('film'))
    await card('poster')
      .getByRole('button', { name: 'Replace file', exact: true })
      .click()
    await page.getByRole('alertdialog').waitFor()
    await page
      .getByRole('button', { name: 'Keep current upload', exact: true })
      .click()
    await card('poster')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.poster))
    await card('poster')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    await card('poster')
      .getByText('Upload completed', { exact: true })
      .waitFor()
    await edit
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await edit.getByText(/changed in another session/i).waitFor()
    assert.equal(
      await edit.getByLabel('Title *', { exact: true }).inputValue(),
      'Retained dirty metadata',
    )
    await edit.close()
    stage = 'series-cover'
    await page.goto(path('series'))
    await card('poster')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.poster))
    await card('poster')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    await card('poster')
      .getByText('Upload completed', { exact: true })
      .waitFor()
    await mediaControl({ runJobs: true })
    await page
      .getByRole('button', { name: 'Refresh media', exact: true })
      .click()
    await card('poster').getByText('Ready', { exact: true }).waitFor()
    assert.equal(await card('source').count(), 0)
    assert.equal(await page.locator('a[href*="/preview"]').count(), 0)
    stage = 'leave-auth'
    await page.goto(path('standalone'))
    await mediaControl({ failureStatus: 503 })
    hold = true
    held = false
    await card('source')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.source))
    await card('source')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    await card('source')
      .getByText('Check upload status', { exact: true })
      .waitFor()
    assert.ok(
      page.url().includes(data.ids.standaloneDraft),
      'Business outage must preserve the authorized owner and selected file',
    )
    await mediaControl({ failureStatus: 0 })
    await card('source')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    for (let i = 0; i < 100 && !held; i++)
      await new Promise((r) => setTimeout(r, 50))
    assert.ok(held)
    const another = await context.newPage()
    await another.goto(path('standalone'))
    const other = another.locator('[data-media-kind="source"]')
    await other
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.source))
    const presignsBefore = (await proof()).traces.filter((t) =>
      t.path.endsWith('/parts'),
    ).length
    await other
      .getByRole('button', { name: 'Resume upload', exact: true })
      .click()
    await other
      .getByText(
        'Another tab is managing this upload. Pause it there before continuing.',
        { exact: true },
      )
      .waitFor()
    assert.equal(
      (await proof()).traces.filter((t) => t.path.endsWith('/parts')).length,
      presignsBefore,
    )
    await another.close()
    await context.setOffline(true)
    await card('source').getByText('Paused', { exact: true }).waitFor()
    release?.()
    held = false
    await context.setOffline(false)
    await card('source')
      .getByRole('button', { name: 'Resume upload', exact: true })
      .click()
    for (let i = 0; i < 100 && !held; i++)
      await new Promise((r) => setTimeout(r, 50))
    assert.ok(held)
    await page
      .getByRole('button', { name: 'Back to content', exact: true })
      .click()
    await page.getByRole('alertdialog').waitFor()
    await page.getByRole('button', { name: 'Stay here', exact: true }).click()
    assert.ok(page.url().includes(data.ids.standaloneDraft))
    await page
      .getByRole('button', { name: 'Back to content', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Pause and leave', exact: true })
      .click()
    release?.()
    hold = false
    await page.getByRole('heading', { name: 'Content', exact: true }).waitFor()
    await page.goto(path('standalone'))
    await card('source')
      .getByText('Select the same file to resume', { exact: true })
      .waitFor()
    await card('source')
      .getByRole('button', { name: 'Cancel upload', exact: true })
      .click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Cancel upload', exact: true })
      .click()
    await card('source')
      .getByText('No upload selected', { exact: true })
      .waitFor()
    hold = true
    held = false
    await card('source')
      .locator('input[type=file]')
      .setInputFiles(disk(data.files.source))
    await card('source')
      .getByRole('button', { name: 'Upload file', exact: true })
      .click()
    for (let i = 0; i < 100 && !held; i++)
      await new Promise((r) => setTimeout(r, 50))
    assert.ok(held)
    const pendingSession = (await proof()).sessions.find(
      (s) => s.owner_id === data.ids.standaloneDraft && s.status === 'pending',
    )
    assert.ok(pendingSession)
    const persisted = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      values: [
        ...Object.values(localStorage),
        ...Object.values(sessionStorage),
      ].join('\n'),
    }))
    assert.ok(persisted.local.every((key) => /theme/i.test(key)))
    // TanStack Router persists scroll positions independently of upload state.
    assert.ok(
      persisted.session.every((key) => key === 'tsr-scroll-restoration-v1_3'),
    )
    assert.ok(
      !/X-Amz-|expectedSha256|source\.mp4|cover\.jpg/.test(persisted.values),
    )
    assert.ok(!persisted.values.includes(pendingSession.id))
    await page.getByRole('button', { name: 'Log out', exact: true }).click()
    release?.()
    hold = false
    await page.waitForURL(/\/admin\/login/)
    assert.equal(await page.getByRole('alertdialog').count(), 0)
    assert.equal(
      (
        await page.request.post(
          baseURL + '/api/admin/media/uploads/' + pendingSession.id + '/parts',
          { data: { partNumber: 1 } },
        )
      ).status(),
      401,
    )
    await page.goBack()
    await page.waitForURL(/\/admin\/login/)
    assert.deepEqual(errors, [])
    console.log(
      'Browser: media uploader — 45 theme/viewport layouts, direct MinIO multipart, refresh/full-hash resume, wrong-file block, matching source hash and one-job completion replay, processing/ready, dirty 409 retention, series cover, authorized API-outage recovery, cross-tab exclusion, offline/resume, leave/pause/cancel, in-flight logout/back passed',
    )
    await control({ outage: false, role: 'admin' })
  }
} catch (error) {
  console.error(
    JSON.stringify({
      stage,
      message: String(error.message)
        .replace(/https?:\/\/\S+/g, '[URL]')
        .slice(0, 1500),
    }),
  )
  process.exitCode = 1
} finally {
  await browser.close()
}
