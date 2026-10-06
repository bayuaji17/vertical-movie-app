import assert from 'node:assert/strict'
import { win32 } from 'node:path'
const [baseURL, moduleURL, executablePath, controlURL] = process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
let stage = 'setup',
  debugPage
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
  debugPage = page
  page.on('pageerror', (e) => errors.push(e.message))
  const proof = async () => (await fetch(controlURL + '/media-proof')).json()
  const control = async (body, media = false) => {
    const r = await fetch(
      controlURL + (media ? '/control/media' : '/control'),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    assert.ok(r.ok)
  }
  const disk = (p) =>
    process.platform === 'win32'
      ? win32.join(
          '\\\\wsl.localhost',
          process.env.WSL_DISTRO_NAME ?? 'Debian',
          p,
        )
      : p
  const button = (name) => page.getByRole('button', { name, exact: true })
  const waitEnabled = async (locator) => {
    await locator.waitFor()
    for (let i = 0; i < 300; i++) {
      if (await locator.isEnabled()) return
      await page.waitForTimeout(50)
    }
    assert.fail(
      'Action did not become enabled: ' + (await locator.textContent()),
    )
  }
  const refresh = async () => {
    const b = page.locator('[aria-label="Publication"]').getByRole('button', {
      name: /^(Refresh status|Check status)$/,
    })
    await waitEnabled(b)
    await b.click()
  }
  const anonymous = await browser.newContext()
  const publicStatus = async (path, expected) =>
    assert.equal(
      (await anonymous.request.get(baseURL + '/api' + path)).status(),
      expected,
      path,
    )
  const play = async (target) => {
    await target.waitForFunction(
      () => document.querySelector('video')?.readyState >= 2,
    )
    await target.locator('button[class~="group/play"]').click()
    await target.waitForFunction(
      () => document.querySelector('video')?.currentTime > 0,
    )
  }
  const files = (await proof()).files
  const createReady = async (type) => {
    stage = 'create-upload-' + type
    await page.goto(baseURL + '/admin/content/new')
    await page.locator('#type').selectOption(type)
    const title =
      type === 'film'
        ? 'Publication ' + 'A long title for responsive review '.repeat(5)
        : 'Publication Standalone'
    const slug = 'publication-browser-' + type
    await page.locator('#title').fill(title)
    await page.locator('#slug').fill(slug)
    await page
      .locator('#synopsis')
      .fill(
        'A complete browser acceptance story with real uploaded media and explicit publication.',
      )
    await page
      .getByRole('checkbox', { name: /I confirm that I have the rights/ })
      .check()
    await button('Create draft').click()
    await page.waitForURL(/\/admin\/content\/(film|standalone)\/[0-9a-f-]+/)
    const id = new URL(page.url()).pathname.split('/').filter(Boolean).at(-1)
    await page
      .getByRole('heading', { name: 'Publication', exact: true })
      .waitFor()
    assert.equal(await button('Publish video').isDisabled(), true)
    await publicStatus('/videos/' + slug, 404)
    await publicStatus('/videos/' + slug + '/playback', 404)
    const before = await (
      await anonymous.request.get(baseURL + '/api/videos')
    ).json()
    assert.ok(!before.items.some((row) => row.id === id))
    for (const kind of ['source', 'poster']) {
      const card = page.locator(`[data-media-kind="${kind}"]`)
      await card.locator('input[type=file]').setInputFiles(disk(files[kind]))
      if (kind === 'poster') {
        const crop = page.getByRole('dialog', {
          name: 'Crop cover',
          exact: true,
        })
        await crop
          .getByRole('button', { name: 'Use crop', exact: true })
          .click()
        await crop.waitFor({ state: 'hidden' })
      }
      await waitEnabled(
        card.getByRole('button', { name: 'Upload file', exact: true }),
      )
      await card
        .getByRole('button', { name: 'Upload file', exact: true })
        .click()
      await card
        .getByText(kind === 'poster' ? 'Ready' : 'Upload completed', {
          exact: true,
        })
        .waitFor({ timeout: 45000 })
    }
    await control({ runJobs: true }, true)
    await waitEnabled(button('Publish video'))
    await page
      .getByRole('button', { name: 'Preview video', exact: true })
      .click()
    await page.waitForURL(/\/preview/)
    await page.reload()
    await page.locator('video').waitFor()
    await play(page)
    await page.waitForFunction(
      () => document.querySelector('video')?.currentTime > 0,
    )
    await page
      .getByRole('button', { name: 'Back to content details', exact: true })
      .click()
    await waitEnabled(button('Publish video'))
    return { id, slug, type, url: page.url() }
  }
  const openPublish = async () => {
    await waitEnabled(button('Publish video'))
    await button('Publish video').click()
    const dialog = page.getByRole('alertdialog')
    await dialog.waitFor()
    await dialog.getByRole('checkbox').waitFor()
    assert.equal(
      await dialog
        .getByRole('button', { name: 'Publish video', exact: true })
        .isDisabled(),
      true,
    )
    return dialog
  }
  const confirmPublish = async () => {
    const d = await openPublish()
    await d.getByRole('checkbox').check()
    await d.getByRole('button', { name: 'Publish video', exact: true }).click()
  }
  const film = await createReady('film')
  stage = 'owner-hashing-interlock'
  const sourceCard = page.locator('[data-media-kind="source"]')
  await page.evaluate(() => {
    window.__publicationOriginalPostMessage = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (message, ...rest) {
      if (message instanceof File) {
        window.__publicationHashHeld = true
        return
      }
      return window.__publicationOriginalPostMessage.call(
        this,
        message,
        ...rest,
      )
    }
  })
  await sourceCard.locator('input[type=file]').setInputFiles(disk(files.source))
  await sourceCard
    .getByRole('button', { name: 'Upload file', exact: true })
    .click()
  await page.waitForFunction(() => window.__publicationHashHeld)
  assert.equal(await button('Publish video').isDisabled(), true)
  await refresh()
  assert.equal(await button('Publish video').isDisabled(), true)
  assert.ok(
    await sourceCard.getByText('source.mp4', { exact: true }).isVisible(),
  )
  await sourceCard.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.evaluate(() => {
    Worker.prototype.postMessage = window.__publicationOriginalPostMessage
  })
  await waitEnabled(button('Publish video'))
  await context.setOffline(true)
  await page.waitForFunction(() => !navigator.onLine)
  assert.equal(await button('Publish video').isDisabled(), true)
  await context.setOffline(false)
  await refresh()
  await waitEnabled(button('Publish video'))
  stage = 'layout-focus'
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['Light', 'Dark', 'System']) {
      await button('Account menu').click()
      await page
        .getByRole('menuitemradio', { name: theme, exact: true })
        .click()
      await page.keyboard.press('Escape')
      await page.getByRole('menu').waitFor({ state: 'hidden' })
      const d = await openPublish()
      assert.equal(
        await d
          .getByRole('button', { name: 'Cancel', exact: true })
          .evaluate((el) => el === document.activeElement),
        true,
      )
      await d.getByRole('checkbox').check()
      await page.emulateMedia({
        colorScheme: theme === 'System' ? 'dark' : 'light',
      })
      assert.equal(await d.getByRole('checkbox').isChecked(), true)
      for (let n = 0; n < 5; n++) {
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
      for (const b of await d.getByRole('button').all())
        assert.ok((await b.boundingBox()).height >= 44)
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      assert.ok((await d.boundingBox()).width <= width)
      if (width === 390 && theme !== 'System') {
        const image = await page.screenshot({ fullPage: true })
        assert.ok(
          (
            await fetch(
              controlURL +
                '/cover-screenshot?name=publication-mobile-' +
                theme.toLowerCase(),
              { method: 'POST', body: image },
            )
          ).ok,
        )
      }
      await page.keyboard.press('Escape')
      await d.waitFor({ state: 'hidden' })
      await page.waitForFunction(
        (el) => el === document.activeElement,
        await button('Publish video').elementHandle(),
      )
      assert.equal(
        await button('Publish video').evaluate(
          (el) => el === document.activeElement,
        ),
        true,
      )
    }
  }
  assert.equal(
    (await proof()).operations.filter((o) => o.video_id === film.id).length,
    0,
  )
  stage = 'active-upload-readiness-race'
  let busyDialog = await openPublish()
  await busyDialog.getByRole('checkbox').check()
  const busy = await context.request.post(
    baseURL + '/api/admin/media/uploads',
    {
      data: {
        ownerType: 'video',
        ownerId: film.id,
        kind: 'source',
        filename: 'source.mp4',
        contentType: 'video/mp4',
        sizeBytes: String(files.sourceSize),
        expectedSha256: (await proof()).sourceSha256,
        idempotencyKey: crypto.randomUUID(),
      },
    },
  )
  assert.equal(busy.status(), 201)
  const busyId = (await busy.json()).id
  await busyDialog
    .getByRole('button', { name: 'Publish video', exact: true })
    .click()
  await busyDialog.waitFor({ state: 'hidden' })
  assert.equal(
    (await proof()).operations.filter((o) => o.video_id === film.id).length,
    0,
  )
  assert.ok(
    (
      await context.request.post(
        baseURL + '/api/admin/media/uploads/' + busyId + '/abort',
        { data: {} },
      )
    ).ok(),
  )
  await refresh()
  await waitEnabled(button('Publish video'))
  stage = 'freshness-race'
  let d = await openPublish()
  await d.getByRole('checkbox').check()
  let detail = await (
    await context.request.get(baseURL + '/api/admin/videos/' + film.id)
  ).json()
  assert.ok(
    (
      await context.request.patch(baseURL + '/api/admin/videos/' + film.id, {
        data: {
          expectedVersion: detail.rowVersion,
          synopsis: detail.synopsis + ' Metadata changed in another tab.',
        },
      })
    ).ok(),
  )
  await d.getByRole('button', { name: 'Publish video', exact: true }).click()
  await d.waitFor({ state: 'hidden' })
  assert.equal(
    (await proof()).operations.filter((o) => o.video_id === film.id).length,
    0,
  )
  await refresh()
  await waitEnabled(button('Publish video'))
  stage = 'known-command-conflict'
  const publishPath = '**/api/admin/videos/' + film.id + '/publish'
  let conflictSeen = false
  await context.route(publishPath, async (route) => {
    const old = await (
      await context.request.get(baseURL + '/api/admin/videos/' + film.id)
    ).json()
    assert.ok(
      (
        await context.request.patch(baseURL + '/api/admin/videos/' + film.id, {
          data: {
            expectedVersion: old.rowVersion,
            synopsis: old.synopsis + ' Server race.',
          },
        })
      ).ok(),
    )
    const r = await route.fetch()
    assert.equal(r.status(), 409)
    conflictSeen = true
    await route.fulfill({ response: r })
  })
  await confirmPublish()
  await page
    .getByText(/Content has changed\. Refresh status and review again\./i)
    .waitFor()
  assert.equal(conflictSeen, true)
  await context.unroute(publishPath)
  await refresh()
  stage = 'lost-before-explicit-retry'
  let firstPayload,
    payloads = [],
    committed = false
  await context.route(publishPath, async (route) => {
    const body = route.request().postDataJSON()
    payloads.push(body)
    if (!firstPayload) {
      firstPayload = body
      await route.abort()
      return
    }
    assert.equal(JSON.stringify(body) === JSON.stringify(firstPayload), true)
    const result = await route.fetch()
    assert.ok(result.ok())
    committed = true
    await route.abort()
  })
  await confirmPublish()
  await button('Retry publish').waitFor()
  await refresh()
  assert.equal(
    (await proof()).operations.filter((o) => o.video_id === film.id).length,
    0,
  )
  await button('Retry publish').dblclick()
  await waitEnabled(button('Archive video'))
  assert.equal(committed, true)
  assert.equal(payloads.length, 2)
  await context.unroute(publishPath)
  const staleReplay = firstPayload
  await publicStatus('/videos/' + film.slug, 200)
  await publicStatus('/videos/' + film.slug + '/playback', 200)
  let catalog = await (
    await anonymous.request.get(baseURL + '/api/videos')
  ).json()
  assert.ok(catalog.items.some((row) => row.id === film.id))
  const watch = await anonymous.newPage()
  await watch.goto(baseURL + '/watch/' + film.slug)
  await watch.locator('video').waitFor()
  await play(watch)
  await watch.waitForFunction(
    () => document.querySelector('video')?.currentTime > 0,
  )
  await watch.close()
  const standalone = await createReady('standalone')
  stage = 'malformed-after-real-commit'
  const standalonePath = '**/api/admin/videos/' + standalone.id + '/publish'
  await context.route(standalonePath, async (route) => {
    const r = await route.fetch()
    assert.ok(r.ok())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{malformed',
    })
  })
  await confirmPublish()
  await waitEnabled(button('Archive video'))
  await context.unroute(standalonePath)
  await publicStatus('/videos/' + standalone.slug, 200)
  const standaloneWatch = await anonymous.newPage()
  await standaloneWatch.goto(baseURL + '/watch/' + standalone.slug)
  await standaloneWatch.locator('video').waitFor()
  await play(standaloneWatch)
  await standaloneWatch.waitForFunction(
    () => document.querySelector('video')?.currentTime > 0,
  )
  await standaloneWatch.close()
  stage = 'confirmed-archive-failed-refetch'
  let archived = false,
    archivePosts = 0
  const standaloneAdmin = '**/api/admin/videos/' + standalone.id + '**'
  await context.route(standaloneAdmin, async (route) => {
    if (
      route.request().method() === 'POST' &&
      route.request().url().endsWith('/archive')
    ) {
      const r = await route.fetch()
      assert.ok(r.ok())
      archived = true
      archivePosts++
      await route.fulfill({ response: r })
    } else if (archived && route.request().method() === 'GET')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'CONTENT_DEPENDENCY_UNAVAILABLE',
            message: 'Unavailable',
            requestId: 'fixture',
          },
        }),
      })
    else await route.continue()
  })
  await button('Archive video').click()
  d = page.getByRole('alertdialog')
  await d.getByRole('button', { name: 'Archive video', exact: true }).click()
  await page
    .getByText('Archived. Status refresh is unavailable.', { exact: true })
    .waitFor()
  assert.equal(archivePosts, 1)
  await context.unroute(standaloneAdmin)
  await refresh()
  await page.getByText('This video is archived.', { exact: true }).waitFor()
  await publicStatus('/videos/' + standalone.slug + '/playback', 404)
  stage = 'archive-access-expiry'
  await page.goto(film.url)
  await waitEnabled(button('Archive video'))
  const signed = await (
    await anonymous.request.get(
      baseURL + '/api/videos/' + film.slug + '/playback',
    )
  ).json()
  assert.equal((await fetch(signed.posterUrl)).status, 200)
  let releaseArchive,
    archiveCommitted = false
  const filmArchivePath = '**/api/admin/videos/' + film.id + '/archive'
  await context.route(filmArchivePath, async (route) => {
    const r = await route.fetch()
    assert.ok(r.ok())
    archiveCommitted = true
    await new Promise((resolve) => {
      releaseArchive = resolve
    })
    await route.fulfill({ response: r }).catch(() => {})
  })
  await button('Archive video').click()
  d = page.getByRole('alertdialog')
  await d.getByRole('button', { name: 'Archive video', exact: true }).click()
  for (let i = 0; i < 300 && !archiveCommitted; i++)
    await page.waitForTimeout(20)
  assert.equal(archiveCommitted, true)
  assert.equal(
    await d.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(),
    true,
  )
  await page.keyboard.press('Escape')
  assert.equal(await d.isVisible(), true)
  assert.ok(
    await d
      .getByRole('status')
      .getByText('Archiving…', { exact: true })
      .isVisible(),
  )
  await control({ role: 'user' })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page
    .getByRole('heading', { name: 'Admin access denied', exact: true })
    .waitFor()
  releaseArchive()
  await page.waitForTimeout(100)
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
  await context.unroute(filmArchivePath)
  await control({ role: 'admin' })
  await page.goto(film.url)
  await refresh()
  await page.getByText('This video is archived.', { exact: true }).waitFor()
  await publicStatus('/videos/' + film.slug, 404)
  await publicStatus('/videos/' + film.slug + '/playback', 404)
  await publicStatus('/playback/videos/' + film.slug + '/master.m3u8', 404)
  await publicStatus('/playback/videos/' + film.slug + '/variants/0', 404)
  assert.equal((await fetch(signed.posterUrl)).status, 200)
  const replay = await context.request.post(
    baseURL + '/api/admin/videos/' + film.id + '/publish',
    { data: staleReplay },
  )
  assert.ok(replay.ok())
  assert.equal((await replay.json()).publicationStatus, 'published')
  await refresh()
  await page.getByText('This video is archived.', { exact: true }).waitFor()
  assert.equal(await button('Publish video').count(), 0)
  catalog = await (await anonymous.request.get(baseURL + '/api/videos')).json()
  assert.ok(
    !catalog.items.some((row) => [film.id, standalone.id].includes(row.id)),
  )
  stage = 'list-preview-refresh-auth-cleanup'
  const listURL =
    baseURL +
    '/admin/content?type=film&search=Publication&page=2&pageSize=10&includeArchived=true'
  await page.goto(listURL)
  await page.reload()
  assert.equal(new URL(page.url()).searchParams.get('search'), 'Publication')
  assert.equal(new URL(page.url()).searchParams.get('page'), '2')
  const ids = (await proof()).ids
  await page.goto(baseURL + '/admin/content/series/' + ids.seriesDraft)
  assert.equal(
    await page
      .getByRole('heading', { name: 'Publication', exact: true })
      .count(),
    0,
  )
  await page.goto(film.url)
  await page
    .getByRole('heading', { name: 'Publication', exact: true })
    .waitFor()
  const readinessPath =
    '**/api/admin/videos/' + film.id + '/publication-readiness'
  await context.route(readinessPath, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'CONTENT_DEPENDENCY_UNAVAILABLE',
          message: 'Unavailable',
          requestId: 'fixture',
        },
      }),
    }),
  )
  await refresh()
  await page
    .getByText('Publication status unavailable.', { exact: true })
    .waitFor()
  assert.ok(!page.url().includes('/login'))
  assert.equal(
    await page
      .getByRole('heading', { name: 'Publication', exact: true })
      .count(),
    1,
  )
  await context.unroute(readinessPath)
  await refresh()
  await control({ role: 'user' })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth'],
    }),
  )
  await page
    .getByRole('heading', { name: 'Admin access denied', exact: true })
    .waitFor()
  const privateQueries = await page.evaluate(
    () =>
      window.__TSR_ROUTER__.options.context.queryClient
        .getQueryCache()
        .getAll()
        .filter((q) => q.queryKey[0] === 'admin').length,
  )
  assert.equal(privateQueries, 0)
  await control({ role: 'admin' })
  stage = 'expiry-and-final-proof'
  const wait = Date.parse(signed.expiresAt) - Date.now() + 1500
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  assert.equal((await fetch(signed.posterUrl)).status, 403)
  const final = await proof()
  for (const owner of [film, standalone]) {
    const row = final.publications.find((r) => r.id === owner.id)
    assert.equal(row.publication_status, 'archived')
    assert.equal(row.row_version, owner.type === 'film' ? 7 : 5)
    const current = await (
      await context.request.get(baseURL + '/api/admin/videos/' + owner.id)
    ).json()
    assert.equal(current.rowVersion, row.row_version)
    assert.equal(current.publicationStatus, row.publication_status)
    assert.equal(current.firstPublishedAt, row.first_published_at)
    assert.equal(current.archivedAt, row.archived_at)
    assert.ok(
      row.first_published_at && row.archived_at && row.rights_confirmed_at,
    )
    assert.equal(row.published_at, null)
    assert.equal(
      final.operations.filter(
        (o) => o.video_id === owner.id && o.action === 'publish',
      ).length,
      1,
    )
    assert.equal(
      final.assets.filter((a) => a.owner_id === owner.id && a.state === 'ready')
        .length,
      2,
    )
  }
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  )
  assert.ok(
    !storage.includes('X-Amz-') &&
      !storage.includes(staleReplay.idempotencyKey),
  )
  assert.deepEqual(errors, [])
  console.log(
    'Browser: publication Film/Standalone create/upload/FFmpeg/preview/watch/archive; 15 theme/viewport cases, focus/keyboard/manual consent, real conflict, same-intent retry/lost and malformed committed responses, failed refresh, cached public invalidation/replay/expiry, auth cleanup and private storage passed.',
  )
} catch (error) {
  console.error('Publication browser stage:', stage)
  if (debugPage)
    console.error(
      await debugPage
        .locator('[aria-label=Publication], [data-media-kind]')
        .allTextContents(),
    )
  throw error
} finally {
  await browser.close()
}
