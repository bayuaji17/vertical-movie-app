import assert from 'node:assert/strict'
import { win32 } from 'node:path'
const [
  baseURL,
  moduleURL,
  executablePath,
  controlURL,
  screenshotPrefix,
  phase,
] = process.argv.slice(2)
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
  const createEpisode = async (title, number) => {
    await page.goto(
      baseURL +
        '/admin/series/' +
        ids.seriesDraft +
        '/seasons/' +
        ids.episodeSeason +
        '/episodes/new',
      { waitUntil: 'networkidle' },
    )
    await page.getByLabel('Title *', { exact: true }).fill(title)
    await page.locator('#slug').fill('aser-browser-episode-' + number)
    await page
      .getByLabel('Synopsis', { exact: true })
      .fill('A complete browser episode journey.')
    await page
      .getByLabel('Episode number', { exact: true })
      .fill(String(number))
    await page
      .getByRole('checkbox', { name: /I confirm that I have the rights/ })
      .check()
    await page
      .getByRole('button', { name: 'Save episode', exact: true })
      .click()
    await page.waitForURL(/\/episodes\/[0-9a-f-]+$/)
    return new URL(page.url()).pathname.split('/').at(-1)
  }
  if (phase === 'full') {
    await page.goto(baseURL + '/admin/content/new', {
      waitUntil: 'networkidle',
    })
    await page.locator('#type').selectOption('series')
    await page.locator('#title').fill('Browser Series')
    await page.locator('#slug').fill('aser-browser-series')
    await page
      .getByRole('button', { name: 'Create draft', exact: true })
      .click()
    await page.waitForURL(/\/admin\/content\/series\/[0-9a-f-]+$/)
    ids.seriesDraft = new URL(page.url()).pathname.split('/').at(-1)
    await page
      .getByText('Manage seasons & episodes', { exact: true })
      .first()
      .click()
    await page.getByText('Season 1', { exact: true }).waitFor()
    assert.equal(await page.getByText('Season 1', { exact: true }).count(), 1)
    await page.getByText('Add season', { exact: true }).click()
    await page
      .getByLabel('Season title', { exact: true })
      .fill('Browser season')
    await page.getByRole('button', { name: 'Save season', exact: true }).click()
    await page.getByText('Season 2 · Browser season', { exact: true }).waitFor()
    const seasons = (
      await (
        await page.request.get(
          baseURL + '/api/admin/series/' + ids.seriesDraft + '/seasons',
        )
      ).json()
    ).items
    assert.equal(seasons.length, 2)
    ids.episodeSeason = seasons.find((row) => row.seasonNumber === 2).id
    ids.episodeDraft = await createEpisode('Media Episode', 1)
  }
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
  const uploadBoth = async () => {
    for (const kind of ['source', 'poster']) {
      const card = page.locator('[data-media-kind="' + kind + '"]')
      await card.locator('input[type=file]').setInputFiles(disk(files[kind]))
      if (kind === 'poster') {
        const crop = page.getByRole('dialog', {
          name: 'Crop cover',
          exact: true,
        })
        await crop.waitFor()
        await enabled(
          crop.getByRole('button', { name: 'Use crop', exact: true }),
        )
        await crop
          .getByRole('button', { name: 'Use crop', exact: true })
          .click()
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
  }
  await uploadBoth()
  const worker = await fetch(controlURL + '/control/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ runJobs: true }),
  })
  assert.ok(worker.ok)
  await page.getByRole('button', { name: 'Refresh media', exact: true }).click()
  await page
    .getByRole('button', { name: 'Refresh status', exact: true })
    .click()
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

  if (['publication', 'full'].includes(phase)) {
    const anonymous = await browser.newContext()
    const episode = await (
      await page.request.get(baseURL + '/api/admin/videos/' + ids.episodeDraft)
    ).json()
    const pubStatus = async (path, status) =>
      assert.equal(
        (await anonymous.request.get(baseURL + '/api' + path)).status(),
        status,
        path,
      )
    await pubStatus('/videos/' + episode.slug, 404)
    const publish = async (subject) => {
      const button = page.getByRole('button', {
        name: 'Publish ' + subject,
        exact: true,
      })
      await enabled(button)
      await button.click()
      const d = page.getByRole('alertdialog')
      await d.waitFor()
      assert.equal(
        await d
          .getByRole('button', { name: 'Publish ' + subject, exact: true })
          .isDisabled(),
        true,
      )
      await d.getByRole('checkbox').check()
      await d
        .getByRole('button', { name: 'Publish ' + subject, exact: true })
        .click()
      await d.waitFor({ state: 'hidden' })
    }
    if (phase === 'full') {
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        for (const theme of ['Light', 'Dark', 'System']) {
          await page
            .getByRole('button', { name: 'Account menu', exact: true })
            .click()
          await page
            .getByRole('menuitemradio', { name: theme, exact: true })
            .click()
          await page.keyboard.press('Escape')
          const b = page.getByRole('button', {
            name: 'Publish episode',
            exact: true,
          })
          await enabled(b)
          await b.click()
          const d = page.getByRole('alertdialog')
          await d.waitFor()
          await page.waitForFunction(
            (el) => el === document.activeElement,
            await d
              .getByRole('button', { name: 'Cancel', exact: true })
              .elementHandle(),
          )
          for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab')
            await page.waitForFunction(
              (el) => el.contains(document.activeElement),
              await d.elementHandle(),
            )
            assert.equal(
              await d.evaluate((el) => el.contains(document.activeElement)),
              true,
            )
          }
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          )
          assert.ok((await d.boundingBox()).width <= width)
          for (const button of await d.getByRole('button').all())
            assert.ok((await button.boundingBox()).height >= 44)
          await page.emulateMedia({
            colorScheme: theme === 'System' ? 'dark' : 'light',
          })
          if (screenshotPrefix && width === 390)
            await page.screenshot({
              path:
                screenshotPrefix +
                'episode-publish-' +
                theme.toLowerCase() +
                '.png',
              fullPage: true,
            })
          await page.keyboard.press('Escape')
          await d.waitFor({ state: 'hidden' })
          await page.waitForFunction(
            (el) => el === document.activeElement,
            await b.elementHandle(),
          )
        }
      }
      await context.setOffline(true)
      await page.getByText('You are offline', { exact: true }).waitFor()
      assert.equal(
        await page
          .getByRole('button', { name: 'Publish episode', exact: true })
          .isDisabled(),
        true,
      )
      await context.setOffline(false)
      await page
        .getByRole('button', { name: 'Refresh status', exact: true })
        .click()
      const path = '**/api/admin/videos/' + ids.episodeDraft + '/publish',
        payloads = []
      await context.route(path, async (route) => {
        payloads.push(route.request().postDataJSON())
        if (payloads.length === 1) {
          await route.abort()
          return
        }
        assert.deepEqual(payloads[1], payloads[0])
        const response = await route.fetch()
        assert.equal(response.status(), 200)
        await route.abort()
      })
      await publish('episode')
      await page
        .getByRole('button', { name: 'Retry publish', exact: true })
        .waitFor()
      assert.equal(
        (await proof()).operations.filter(
          (o) => o.video_id === ids.episodeDraft,
        ).length,
        0,
      )
      await page
        .getByRole('button', { name: 'Retry publish', exact: true })
        .dblclick()
      await page
        .getByText('Published · Hidden until series is published', {
          exact: true,
        })
        .waitFor()
      assert.equal(payloads.length, 2)
      await context.unroute(path)
    } else await publish('episode')
    await page
      .getByText('Published \u00B7 Hidden until series is published', {
        exact: true,
      })
      .waitFor()
    await pubStatus('/videos/' + episode.slug, 404)
    let nextEpisode
    if (phase === 'full') {
      nextEpisode = await createEpisode('Next Episode', 2)
      await uploadBoth()
      const jobs = await fetch(controlURL + '/control/media', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runJobs: true }),
      })
      assert.ok(jobs.ok)
      await page
        .getByRole('button', { name: 'Refresh status', exact: true })
        .click()
      await enabled(page.getByText('Preview video', { exact: true }))
      await page.getByText('Preview video', { exact: true }).click()
      await page.waitForFunction(
        () => document.querySelector('video')?.readyState >= 2,
      )
      await page.locator('button[class~="group/play"]').click()
      await page.waitForFunction(
        () => document.querySelector('video')?.currentTime > 0,
      )
      await page.getByText('Back to episode', { exact: true }).click()
      await publish('episode')
      await page
        .getByText('Published · Hidden until series is published', {
          exact: true,
        })
        .waitFor()
    }
    await page.goto(baseURL + '/admin/content/series/' + ids.seriesDraft, {
      waitUntil: 'networkidle',
    })
    await page.getByText('Edit metadata', { exact: true }).first().click()
    await page
      .locator('#synopsis')
      .fill(
        'A series prepared and manually published through the admin workflow.',
      )
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await page.waitForURL(baseURL + '/admin/content/series/' + ids.seriesDraft)
    const card = page.locator('[data-media-kind="poster"]')
    await card.locator('input[type=file]').setInputFiles(disk(files.poster))
    const crop = page.getByRole('dialog', { name: 'Crop cover', exact: true })
    await crop.waitFor()
    await enabled(crop.getByRole('button', { name: 'Use crop', exact: true }))
    await crop.getByRole('button', { name: 'Use crop', exact: true }).click()
    await crop.waitFor({ state: 'hidden' })
    const upload = card.getByRole('button', {
      name: 'Upload file',
      exact: true,
    })
    await enabled(upload)
    await upload.click()
    await card.getByText('Ready', { exact: true }).waitFor({ timeout: 45000 })
    await page
      .getByRole('button', { name: 'Refresh status', exact: true })
      .click()
    if (phase === 'full') {
      const path = '**/api/admin/series/' + ids.seriesDraft + '/publish'
      let seen = false
      await context.route(path, async (route) => {
        const old = await (
          await context.request.get(
            baseURL + '/api/admin/series/' + ids.seriesDraft,
          )
        ).json()
        assert.equal(
          (
            await context.request.patch(
              baseURL + '/api/admin/series/' + ids.seriesDraft,
              {
                data: {
                  expectedVersion: old.rowVersion,
                  description: 'A real write race',
                },
              },
            )
          ).status(),
          200,
        )
        const result = await route.fetch()
        assert.equal(result.status(), 409)
        seen = true
        await route.fulfill({ response: result })
      })
      await publish('series')
      await page
        .getByText('Content has changed. Refresh status and review again.', {
          exact: true,
        })
        .waitFor()
      assert.equal(seen, true)
      await context.unroute(path)
      await page
        .getByRole('button', { name: 'Refresh status', exact: true })
        .click()
      let count = 0
      await context.route(path, async (route) => {
        count++
        const result = await route.fetch()
        assert.equal(result.status(), 200)
        await route.abort()
      })
      await publish('series')
      await page.getByText('Open public series', { exact: true }).waitFor()
      assert.equal(count, 1)
      await context.unroute(path)
    } else await publish('series')
    await page.getByText('Open public series', { exact: true }).waitFor()
    assert.equal(
      await page
        .getByRole('button', { name: 'Archive series', exact: true })
        .count(),
      0,
    )
    const parent = await (
      await page.request.get(baseURL + '/api/admin/series/' + ids.seriesDraft)
    ).json()
    await pubStatus('/series/' + parent.slug, 200)
    await pubStatus('/videos/' + episode.slug, 200)
    await pubStatus('/videos/' + episode.slug + '/playback', 200)
    if (phase === 'full') {
      assert.equal(
        (
          await (
            await anonymous.request.get(
              baseURL + '/api/videos/' + episode.slug + '/next',
            )
          ).json()
        ).id,
        nextEpisode,
      )
      const watch = await anonymous.newPage()
      await watch.goto(baseURL + '/watch/' + episode.slug)
      await watch.waitForFunction(
        () => document.querySelector('video')?.readyState >= 2,
      )
      await watch.locator('button[class~="group/play"]').click()
      await watch.waitForFunction(
        () => document.querySelector('video')?.currentTime > 0,
      )
      const next = watch.getByText('Next episode · S2 E2', { exact: true })
      await next.waitFor()
      await next.click()
      await watch.waitForURL(/\/watch\//)
      await watch
        .getByRole('heading', { name: 'Next Episode', exact: true })
        .waitFor()
      await watch.close()
    }
    await page.goto(baseURL + detail, { waitUntil: 'networkidle' })
    await page
      .getByRole('button', { name: 'Refresh status', exact: true })
      .click()
    await page.getByText('Open public episode', { exact: true }).waitFor()
    const archive = page.getByRole('button', {
      name: 'Archive episode',
      exact: true,
    })
    await enabled(archive)
    await archive.click()
    const dialog = page.getByRole('alertdialog')
    await dialog.waitFor()
    await dialog
      .getByRole('button', { name: 'Archive episode', exact: true })
      .click()
    await dialog.waitFor({ state: 'hidden' })
    await page
      .getByText('This content is archived and read only.', { exact: true })
      .waitFor()
    await pubStatus('/videos/' + episode.slug, 404)
    await pubStatus('/videos/' + episode.slug + '/playback', 404)
    assert.equal(
      await page.getByText('Publish episode', { exact: true }).count(),
      0,
    )
    const final = await (
      await page.request.get(baseURL + '/api/admin/videos/' + ids.episodeDraft)
    ).json()
    assert.equal(final.publicationStatus, 'archived')
    assert.equal(final.rowVersion, 5)
    const persisted = await proof()
    assert.ok(
      persisted.operations.some(
        (o) => o.video_id === ids.episodeDraft && o.action === 'publish',
      ),
    )
    assert.ok(
      persisted.operations.some(
        (o) => o.series_id === ids.seriesDraft && o.action === 'publish',
      ),
    )
    if (phase === 'full') {
      assert.equal(
        (
          await (
            await anonymous.request.get(baseURL + '/api/series/' + parent.slug)
          ).json()
        ).playableEpisodeCount,
        1,
      )
      await fetch(controlURL + '/control', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'user' }),
      })
      await page.evaluate(() =>
        window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
          queryKey: ['auth', 'session'],
        }),
      )
      await page
        .getByRole('heading', { name: 'Admin access denied', exact: true })
        .waitFor()
      assert.equal(
        await page.evaluate(
          () =>
            window.__TSR_ROUTER__.options.context.queryClient
              .getQueryCache()
              .getAll()
              .filter((q) => q.queryKey[0] === 'admin').length,
        ),
        0,
      )
      console.log(
        'Browser: Created Series/default Season1/Season2/two episodes through UI, 15 theme/viewport keyboard cases, offline/manual consent, same-intent lost-before retry and lost-after reconciliation, real Series409, public HLS/Next, archived child counts and native SDK authorization cleanup passed.',
      )
    }
    await anonymous.close()
    console.log(
      'Browser: Episode hidden publication, ready Series cover/metadata/manual publish, anonymous effective access, absent Series archive and Episode archive denial with SQL receipts passed.',
    )
  }
  assert.deepEqual(errors, [])
  console.log(
    'Browser: Series episode real upload/crop, 600s/512MB policy, invalid file, FFmpeg verified HLS playback, correct preview Back, unchanged draft metadata and private cover passed.',
  )
  await context.close()
} finally {
  await browser.close()
}
