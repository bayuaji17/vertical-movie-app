import assert from 'node:assert/strict'
const [baseURL, moduleURL, executablePath, controlURL, screenshotPrefix] =
  process.argv.slice(2)
const { chromium } = await import(moduleURL)
const browser = await chromium.launch({ headless: true, executablePath })
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
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /hydration|Minified React error/i.test(m.text())
    )
      errors.push(m.text())
  })
  page.on('dialog', (dialog) => dialog.accept())
  const control = async (input) =>
    fetch(controlURL + '/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  await control({ role: 'admin', outage: false, held: false })
  const ids = (await (await fetch(controlURL + '/content-proof')).json()).ids
  const seriesId = ids.parentSeries,
    base = `/admin/series/${seriesId}/seasons`
  const go = async (path) => {
    await page.goto(baseURL + path, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { level: 1 }).waitFor()
  }
  const title = async (name) =>
    page.getByRole('heading', { name, exact: true }).waitFor()
  const save = () =>
    page.getByRole('button', { name: 'Save season', exact: true })
  await go(`/admin/content/series/${seriesId}`)
  await page.getByText('Manage seasons & episodes', { exact: true }).click()
  await title('Seasons & episodes')
  await page.getByText('Season 1', { exact: true }).waitFor()
  assert.equal(await page.getByText('Season 1', { exact: true }).count(), 1)
  await page.getByText('View episodes', { exact: true }).click()
  await title('Season 1 episodes')
  await page.getByText('Back to seasons', { exact: true }).click()
  await page.getByText('Add season', { exact: true }).click()
  await title('Add season')
  assert.equal(
    await page.getByLabel('Season number', { exact: true }).inputValue(),
    '2',
  )
  await page.getByLabel('Season number', { exact: true }).fill('0')
  await save().click()
  await page
    .getByText('Enter a whole season number from 1 to 2147483647.')
    .waitFor()
  assert.equal(
    await page
      .getByLabel('Season number', { exact: true })
      .getAttribute('aria-invalid'),
    'true',
  )
  await page.getByLabel('Season number', { exact: true }).fill('1')
  await save().click()
  await page
    .getByText('This season number is already reserved. Choose another number.')
    .waitFor()
  await page.getByLabel('Season number', { exact: true }).fill('2')
  await page.getByLabel('Season title', { exact: true }).fill('Second season')
  await page.getByLabel('Release year', { exact: true }).fill('2026')
  await page.getByLabel('Release date', { exact: true }).fill('2026-10-08')
  await save().click()
  await title('Seasons & episodes')
  const seasons = (
    await (
      await page.request.get(
        baseURL +
          '/api/admin/series/' +
          seriesId +
          '/seasons?includeArchived=true',
      )
    ).json()
  ).items
  assert.equal(seasons.length, 2)
  const second = seasons.find((row) => row.seasonNumber === 2)
  assert.equal(second.title, 'Second season')
  await go(`${base}/${second.id}/edit`)
  await title('Edit season')
  await page.getByLabel('Season title', { exact: true }).fill('Unsaved title')
  await page.getByText('Back to seasons', { exact: true }).click()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  assert.equal(
    await page.getByLabel('Season title', { exact: true }).inputValue(),
    'Unsaved title',
  )
  const update = await page.request.patch(
    baseURL + '/api/admin/seasons/' + second.id,
    { data: { expectedVersion: second.rowVersion, title: 'Concurrent title' } },
  )
  assert.equal(update.status(), 200)
  await save().click()
  await page.getByText(/This content changed in another session/).waitFor()
  assert.equal(
    await page.getByLabel('Season title', { exact: true }).inputValue(),
    'Unsaved title',
  )
  await page
    .getByRole('button', { name: 'Reload latest version', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Reload and discard', exact: true })
    .click()
  await page.waitForFunction(
    () => document.getElementById('title')?.value === 'Concurrent title',
  )
  await page.getByLabel('Season title', { exact: true }).fill('Final title')
  await save().click()
  await title('Seasons & episodes')
  const final = (
    await (
      await page.request.get(
        baseURL +
          '/api/admin/series/' +
          seriesId +
          '/seasons?includeArchived=true',
      )
    ).json()
  ).items.find((row) => row.id === second.id)
  assert.equal(final.title, 'Final title')
  assert.equal(final.rowVersion, 3)
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await go(`${base}/${second.id}/edit`)
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `overflow at ${width}`,
    )
    assert.ok((await save().boundingBox()).height >= 44)
    if (screenshotPrefix)
      await page.screenshot({
        path: screenshotPrefix + `season-${width}.png`,
        fullPage: true,
      })
  }
  await context.setOffline(true)
  await page.getByLabel('Season title', { exact: true }).fill('Offline input')
  await page.waitForFunction(
    () => document.querySelector('button[type="submit"]')?.disabled,
  )
  assert.equal(await save().isDisabled(), true)
  await context.setOffline(false)
  await page.getByText('Back to seasons', { exact: true }).click()
  await page
    .getByRole('button', { name: 'Discard and leave', exact: true })
    .click()
  await title('Seasons & episodes')

  // Actual metadata writes and cursor pagination through the authenticated API.
  const genres = (
    await (
      await page.request.get(baseURL + '/api/admin/genres?limit=20')
    ).json()
  ).items
  const parent = await (
    await page.request.get(baseURL + '/api/admin/series/' + seriesId)
  ).json()
  const genreUpdate = await page.request.patch(
    baseURL + '/api/admin/series/' + seriesId,
    { data: { expectedVersion: parent.rowVersion, genreIds: [genres[0].id] } },
  )
  assert.equal(genreUpdate.status(), 200)
  await go(base + '/' + second.id)
  await title('Season 2 episodes')
  await page.getByText('Add episode', { exact: true }).click()
  await title('Add episode')
  const saveEpisode = () =>
    page.getByRole('button', { name: 'Save episode', exact: true })
  await saveEpisode().click()
  await page.getByText('Enter a title.', { exact: true }).waitFor()
  await page.getByLabel('Title *', { exact: true }).fill('Pilot episode')
  await page
    .getByLabel('Synopsis', { exact: true })
    .fill('First episode synopsis')
  await saveEpisode().click()
  await title('Pilot episode')
  await page
    .getByText('Inherited series genres: ' + genres[0].name, { exact: true })
    .waitFor()
  const created = (
    await (
      await page.request.get(
        baseURL +
          '/api/admin/videos?kind=episode&seriesId=' +
          seriesId +
          '&seasonId=' +
          second.id +
          '&limit=20',
      )
    ).json()
  ).items[0]
  assert.equal(created.episodeNumber, 1)
  assert.equal(created.kind, 'episode')
  await page.getByText('Edit episode', { exact: true }).click()
  await title('Edit episode')
  await page.getByLabel('Episode number', { exact: true }).fill('1')
  await page
    .getByLabel('Season', { exact: true })
    .selectOption(ids.parentSeason)
  await saveEpisode().click()
  await page
    .getByText(
      'This episode number is already reserved in the selected season. Choose another number.',
      { exact: true },
    )
    .waitFor()
  assert.equal(
    await page.getByLabel('Title *', { exact: true }).inputValue(),
    'Pilot episode',
  )
  const concurrent = await page.request.patch(
    baseURL + '/api/admin/videos/' + created.id,
    {
      data: {
        expectedVersion: created.rowVersion,
        title: 'Concurrent episode',
      },
    },
  )
  assert.equal(concurrent.status(), 200)
  await page.getByLabel('Episode number', { exact: true }).fill('23')
  await saveEpisode().click()
  await page.getByText(/This content changed in another session/).waitFor()
  await page
    .getByRole('button', { name: 'Reload latest version', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Reload and discard', exact: true })
    .click()
  await page.waitForFunction(
    () => document.getElementById('title')?.value === 'Concurrent episode',
  )
  await page
    .getByLabel('Season', { exact: true })
    .selectOption(ids.parentSeason)
  await page.getByLabel('Episode number', { exact: true }).fill('23')
  await page.getByLabel('Synopsis', { exact: true }).fill('')
  await saveEpisode().click()
  await title('Concurrent episode')
  const changed = await (
    await page.request.get(baseURL + '/api/admin/videos/' + created.id)
  ).json()
  assert.equal(changed.rowVersion, 3)
  assert.equal(changed.seasonId, ids.parentSeason)
  assert.equal(changed.episodeNumber, 23)
  assert.equal(changed.synopsis, null)
  for (let n = 2; n <= 22; n++) {
    const result = await page.request.post(baseURL + '/api/admin/videos', {
      data: {
        kind: 'episode',
        title: 'Paged episode ' + n,
        seasonId: ids.parentSeason,
        episodeNumber: n,
      },
    })
    assert.equal(result.status(), 201)
  }
  await go(base + '/' + ids.parentSeason)
  await title('Season 1 episodes')
  await page.getByText('View episode', { exact: true }).first().waitFor()
  assert.equal(
    await page.getByText('View episode', { exact: true }).count(),
    20,
  )
  await page
    .getByRole('button', { name: 'Load more episodes', exact: true })
    .click()
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('a')).filter(
        (a) => a.textContent === 'View episode',
      ).length === 23,
  )
  assert.equal(
    await page.getByText('View episode', { exact: true }).count(),
    23,
  )
  await page
    .getByLabel('Search episodes', { exact: true })
    .fill('Paged episode 22')
  await page.waitForURL(/q=Paged/)
  await page
    .getByText('Episode 22 \u00B7 Paged episode 22', { exact: true })
    .waitFor()
  assert.equal(await page.getByText('View episode', { exact: true }).count(), 1)
  const archived = await page.request.post(
    baseURL + '/api/admin/videos/' + created.id + '/archive',
    { data: { expectedVersion: 3 } },
  )
  assert.equal(archived.status(), 200)
  await go('/admin/series/' + seriesId + '/episodes/' + created.id + '/edit')
  await title('Edit episode')
  assert.equal(await saveEpisode().isDisabled(), true)
  assert.equal(
    await page.getByLabel('Title *', { exact: true }).isDisabled(),
    true,
  )
  const other = ids.seriesPublished
  await page.goto(
    baseURL + '/admin/series/' + other + '/episodes/' + created.id,
    { waitUntil: 'networkidle' },
  )
  await page.getByText('Episode unavailable', { exact: true }).waitFor()
  assert.equal(await page.getByText('Edit episode', { exact: true }).count(), 0)
  await go('/admin/series/' + seriesId + '/episodes/' + ids.episode + '/edit')
  await title('Edit episode')
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'episode overflow ' + width,
    )
    assert.ok((await saveEpisode().boundingBox()).height >= 44)
    if (screenshotPrefix)
      await page.screenshot({
        path: screenshotPrefix + 'episode-' + width + '.png',
        fullPage: true,
      })
  }
  const seasonArchive = await page.request.post(
    baseURL + '/api/admin/seasons/' + second.id + '/archive',
    { data: { expectedVersion: 3 } },
  )
  assert.equal(seasonArchive.status(), 200)
  await go(base + '/' + second.id + '/edit')
  assert.equal(await save().isDisabled(), true)
  for (const label of ['Season number', 'Season title', 'Description'])
    assert.equal(
      await page.getByLabel(label, { exact: true }).isDisabled(),
      true,
    )
  await go('/admin/series/' + seriesId + '/episodes/' + ids.episode + '/edit')
  await page.getByLabel('Title *', { exact: true }).fill('An in-flight save')
  let release,
    committed = false
  const held = new Promise((resolve) => {
    release = resolve
  })
  const path = '**/api/admin/videos/' + ids.episode
  await context.route(path, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue()
    const response = await route.fetch()
    assert.equal(response.status(), 200)
    committed = true
    await held
    await route.fulfill({ response }).catch(() => {})
  })
  await saveEpisode().click()
  for (let i = 0; i < 400 && !committed; i++) await page.waitForTimeout(20)
  assert.equal(committed, true)
  await control({ role: 'user' })
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['auth', 'session'],
    }),
  )
  await page
    .getByRole('heading', { name: 'Admin access denied', exact: true })
    .waitFor()
  release()
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
  await context.unroute(path)
  assert.deepEqual(errors, [])
  await context.close()
  console.log(
    'Browser: Series editor default Season1, create, duplicate/validation, stale version, preserved dirty input, explicit reload, saved SQL metadata, selected season, responsive/offline, episode CRUD/grouping/inheritance/duplicate/version/archive/owner isolation and finite cursor pagination passed.',
  )
} finally {
  await browser.close()
}
