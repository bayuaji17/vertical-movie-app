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
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydration|Minified React error/i.test(message.text())
    )
      errors.push(message.text())
  })
  page.on('dialog', (dialog) => dialog.accept())
  const control = async (input) =>
    fetch(controlURL + '/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  const contentControl = async (input) =>
    fetch(controlURL + '/control/content', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  const proof = async () => (await fetch(controlURL + '/content-proof')).json()
  const heading = async (title) =>
    page.getByRole('heading', { name: title, exact: true }).waitFor()
  const title = () => page.getByLabel('Title *', { exact: true })
  const field = (name) =>
    name === 'I confirm that I have the rights to distribute this content.'
      ? page.getByRole('checkbox', { name, exact: true })
      : page.getByLabel(name, { exact: true })
  const theme = async (mode) => {
    await page
      .getByRole('button', { name: 'Account menu', exact: true })
      .click()
    await page.getByRole('menuitemradio', { name: mode, exact: true }).click()
    await page.keyboard.press('Escape')
    await page
      .locator('[data-slot="dropdown-menu-content"]')
      .waitFor({ state: 'detached' })
  }
  const leave = async () => {
    await page
      .getByRole('button', { name: 'Discard and leave', exact: true })
      .click()
  }
  const createPage = async () => {
    await page.goto(baseURL + '/admin/content/new')
    await heading('Create draft')
    await title().waitFor()
  }
  const saved = async () => {
    await heading('Content details')
    await page.waitForURL(
      /\/admin\/content\/(film|standalone|series)\/[\w-]+\/?$/,
    )
    return page.url().split('/').filter(Boolean).at(-1)
  }
  await control({
    role: 'admin',
    outage: false,
    held: false,
    logoutFailure: false,
    loginLimit: false,
  })
  await page.goto(baseURL + '/admin')
  await heading('Dashboard')
  await theme('Light')
  await page.goto(baseURL + '/admin/content')
  await heading('Content')
  await page.getByText('Showing 1–10 of 42', { exact: false }).waitFor()
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `No horizontal overflow at ${width}`,
    )
    if (width < 1024) {
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.getByRole('dialog').waitFor()
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: 'Account menu' }).focus()
      await page.keyboard.press('Enter')
      await page
        .getByRole('menuitemradio', { name: 'Light', exact: true })
        .waitFor()
      await page.keyboard.press('Escape')
      await page.getByRole('menu').waitFor({ state: 'hidden' })
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute('aria-label') === 'Account menu',
      )
      assert.equal(
        await page
          .getByRole('button', { name: 'Account menu' })
          .evaluate((el) => el === document.activeElement),
        true,
      )
    }
    assert.ok(
      (await page.getByRole('button', { name: 'Account menu' }).boundingBox())
        .height >= 44,
    )
  }
  await page.getByRole('button', { name: '5', exact: true }).click()
  await page.getByText('Showing 41–42 of 42', { exact: false }).waitFor()
  assert.equal(
    await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(),
    true,
  )
  await page.goto(baseURL + '/admin/content?type=film&page=999&pageSize=10')
  await page.getByText('Showing 41–42 of 42', { exact: false }).waitFor()
  await page.waitForURL((url) => url.searchParams.get('page') === '5')
  await field('Rows per page').selectOption('custom')
  await field('Custom page size').fill('3')
  await field('Custom page size').press('Enter')
  await page.getByText('Showing 1–3 of 42', { exact: false }).waitFor()
  await field('Custom page size').fill('0')
  await field('Custom page size').press('Tab')
  await page.getByText('Use a whole number from 1 to 100.').waitFor()
  assert.equal(new URL(page.url()).searchParams.get('pageSize'), '3')
  await field('Rows per page').selectOption('10')
  await page.getByText('Showing 1–10 of 42', { exact: false }).waitFor()
  await field('Search content').fill('Slow')
  await page.waitForTimeout(400)
  await field('Search content').fill('Fixture film 01')
  await page.getByText('Showing 1–1 of 1', { exact: false }).waitFor()
  await page.waitForTimeout(1000)
  assert.ok(
    await page
      .getByRole('cell', { name: 'Fixture film 01', exact: true })
      .isVisible(),
  )
  await field('Search content').fill('Definitely absent')
  await page.getByText('No matching content', { exact: true }).waitFor()
  await field('Search content').fill('')
  await page.getByText('Showing 1–10 of 42', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Standalone', exact: true }).click()
  await page.getByText('Showing 1–10 of 42', { exact: false }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('type'), 'standalone')
  await page.getByRole('button', { name: 'Series', exact: true }).click()
  await page.getByText('Showing 1–10 of 42', { exact: false }).waitFor()
  await page
    .getByRole('checkbox', { name: 'Include archived', exact: true })
    .check()
  await page.getByText('Showing 1–10 of 43', { exact: false }).waitFor()
  await page.reload()
  await page.getByText('Showing 1–10 of 43', { exact: false }).waitFor()
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Include archived', exact: true })
      .isChecked(),
    true,
  )
  await createPage()
  await title().fill('Browser Film')
  await field('Slug').fill('browser-film')
  await field('Original title').fill('Original film')
  await field('Synopsis').fill('Initial summary')
  await field('Original language').fill('EN')
  await field('Release year').fill('2024')
  await field('Release date').fill('2024-02-29')
  await field(
    'I confirm that I have the rights to distribute this content.',
  ).check()
  await page.getByRole('checkbox', { name: 'Genre 41', exact: true }).check()
  await page
    .getByRole('button', { name: 'Load more genres', exact: true })
    .click()
  await page.getByRole('checkbox', { name: 'Genre 21', exact: true }).waitFor()
  await page
    .getByRole('button', { name: 'Load more genres', exact: true })
    .click()
  await page.getByRole('checkbox', { name: 'Genre 00', exact: true }).waitFor()
  await field('Search genres').fill('Genre 00')
  await page.getByRole('checkbox', { name: 'Genre 00', exact: true }).check()
  assert.ok(
    await page
      .getByRole('button', { name: 'Remove Genre 41', exact: true })
      .isVisible(),
  )
  const before = (await proof()).traces.length
  await page
    .getByRole('button', { name: 'Create draft', exact: true })
    .dblclick()
  const filmId = await saved()
  const created = (await proof()).traces.slice(before)
  assert.equal(created.filter((x) => x.method === 'POST').length, 1)
  assert.equal(created[0].input.rightsConfirmed, true)
  assert.equal(created[0].input.genreIds.length, 2)
  const filmPath = `/admin/content/film/${filmId}`
  await page.goto(baseURL + filmPath + '/edit')
  await heading('Edit draft')
  assert.equal(
    await page.getByRole('button', { name: 'Save changes' }).isDisabled(),
    true,
  )
  await title().fill('My preserved edit')
  const second = await context.newPage()
  await second.goto(baseURL + filmPath + '/edit')
  await second.getByLabel('Title *', { exact: true }).fill('Other editor')
  await second
    .getByRole('button', { name: 'Save changes', exact: true })
    .click()
  await second
    .getByRole('heading', { name: 'Content details', exact: true })
    .waitFor()
  await second.close()
  await page.evaluate(() =>
    window.__TSR_ROUTER__.options.context.queryClient.invalidateQueries({
      queryKey: ['admin'],
      refetchType: 'active',
    }),
  )
  assert.equal(await title().inputValue(), 'My preserved edit')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await page.getByText(/This content changed in another session/).waitFor()
  assert.equal(await title().inputValue(), 'My preserved edit')
  const conflict = (await proof()).traces.at(-1)
  assert.equal(conflict.status, 409)
  assert.deepEqual(conflict.input, {
    title: 'My preserved edit',
    expectedVersion: 1,
  })
  await page
    .getByRole('button', { name: 'Reload latest version', exact: true })
    .click()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  assert.equal(await title().inputValue(), 'My preserved edit')
  await page
    .getByRole('button', { name: 'Reload latest version', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Reload and discard', exact: true })
    .click()
  await page.waitForFunction(
    () => document.querySelector('#title')?.value === 'Other editor',
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .isDisabled(),
    true,
  )
  for (const name of [
    'Original title',
    'Synopsis',
    'Original language',
    'Release year',
    'Release date',
  ])
    await field(name).fill('')
  while (await page.getByRole('button', { name: /^Remove / }).count())
    await page
      .getByRole('button', { name: /^Remove / })
      .first()
      .click()
  await field(
    'I confirm that I have the rights to distribute this content.',
  ).uncheck()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await saved()
  await page.reload()
  await heading('Content details')
  const canonical = await (
    await context.request.get(baseURL + '/api/admin/videos/' + filmId)
  ).json()
  assert.equal(canonical.rowVersion, 3)
  assert.equal(canonical.originalTitle, null)
  assert.equal(canonical.synopsis, null)
  assert.equal(canonical.rightsConfirmedAt, null)
  assert.deepEqual(canonical.genreIds, [])
  for (const kind of ['Standalone', 'Series']) {
    await createPage()
    await field('Content type').selectOption(kind.toLowerCase())
    await title().fill('Browser ' + kind)
    if (kind === 'Series')
      await field('Series completion').selectOption('completed')
    await page
      .getByRole('button', { name: 'Create draft', exact: true })
      .click()
    const id = await saved()
    const trace = (await proof()).traces.at(-1)
    if (kind === 'Series') {
      assert.equal(trace.path, '/admin/series')
      assert.equal(trace.input.completionStatus, 'completed')
      assert.ok(!('rightsConfirmed' in trace.input))
      assert.ok(!('kind' in trace.input))
      await page.getByText('Season 1', { exact: true }).waitFor()
      const series = await (
        await context.request.get(baseURL + '/api/admin/series/' + id)
      ).json()
      assert.equal(series.seasons.length, 1)
    } else {
      assert.equal(trace.input.kind, 'standalone')
      assert.equal(trace.input.rightsConfirmed, false)
    }
  }
  await createPage()
  await title().fill('Preserved outage')
  await contentControl({ failureStatus: 503 })
  const outageStart = (await proof()).traces.length
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  await page
    .getByText(/The save could not be confirmed. Your input is preserved/)
    .waitFor()
  assert.equal(await title().inputValue(), 'Preserved outage')
  await page.waitForTimeout(500)
  assert.equal((await proof()).traces.slice(outageStart).length, 1)
  await contentControl({ failureStatus: 0 })
  await page.locator('a').filter({ hasText: 'Cancel' }).click()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  assert.equal(await title().inputValue(), 'Preserved outage')
  await page.locator('a').filter({ hasText: 'Cancel' }).click()
  await leave()
  await heading('Content')
  await createPage()
  await title().fill('Conflicting slug')
  await field('Slug').fill('browser-film')
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  await page
    .getByText('This slug is already in use. Choose another.', { exact: true })
    .waitFor()
  assert.equal(await title().inputValue(), 'Conflicting slug')
  assert.equal(await field('Slug').getAttribute('aria-invalid'), 'true')
  await theme('Dark')
  assert.equal(await title().inputValue(), 'Conflicting slug')
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    ),
    true,
  )
  await theme('System')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(
    () => !document.documentElement.classList.contains('dark'),
  )
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark'),
  )
  await theme('Dark')
  await page.reload()
  await heading('Create draft')
  assert.equal(
    await page.evaluate(() => localStorage.getItem('vertical-movie-theme')),
    'dark',
  )
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    ),
    true,
  )
  await page.locator('a').filter({ hasText: 'Cancel' }).click()
  await heading('Content')
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  await heading('Create draft')
  await title().fill('Unsaved back')
  await page.goBack()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  assert.equal(await title().inputValue(), 'Unsaved back')
  assert.equal(
    await page.evaluate(() =>
      window.dispatchEvent(new Event('beforeunload', { cancelable: true })),
    ),
    false,
  )
  const ids = (await proof()).ids
  for (const [type, id] of [
    ['film', ids.filmPublished],
    ['film', ids.filmArchived],
    ['film', ids.episode],
  ]) {
    await page.goto(baseURL + `/admin/content/${type}/${id}/edit`)
    await heading('Content details')
    assert.equal(
      await page
        .getByRole('button', { name: 'Save changes', exact: true })
        .count(),
      0,
    )
  }
  await page.goto(baseURL + '/admin/content/film/not-a-uuid')
  await heading('Content not found')
  await page.goto(
    baseURL + '/admin/content/film/00000000-0000-4000-8000-000000000000',
  )
  await page.getByText('Content not found.', { exact: true }).waitFor()
  await page.goto(baseURL + '/admin/videos/' + filmId + '/preview')
  assert.ok(page.url().includes('/preview'))
  assert.ok(
    !(await page
      .getByRole('heading', { name: 'Content details', exact: true })
      .count()),
  )

  for (const mode of ['Light', 'Dark']) {
    await page.goto(baseURL + '/admin')
    await heading('Dashboard')
    await theme(mode)
    for (const path of [
      '/admin',
      '/admin/content',
      '/admin/content/new',
      filmPath,
      filmPath + '/edit',
    ]) {
      await page.goto(baseURL + path)
      await page.waitForFunction(
        () =>
          document.querySelector('main h1') &&
          !document.querySelector('[aria-label="Loading content details"]'),
      )
      if (path.endsWith('/edit')) await title().waitFor()
      if (path === '/admin/content')
        await page.getByText('Showing 1–10 of 43', { exact: false }).waitFor()

      const contrasts = await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        const pixel = () =>
          Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)
        const luminance = (rgb) =>
          rgb
            .map((v) => {
              const c = v / 255
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
            })
            .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0)
        return Array.from(
          document.querySelectorAll(
            'main h1, main .text-muted-foreground, main .bg-primary',
          ),
        )
          .filter((el) => el.getClientRects().length && el.textContent.trim())
          .map((el) => {
            const ancestors = []
            for (let node = el; node; node = node.parentElement)
              ancestors.unshift(node)
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, 1, 1)
            for (const node of ancestors) {
              ctx.fillStyle = getComputedStyle(node).backgroundColor
              ctx.fillRect(0, 0, 1, 1)
            }
            const bg = pixel()
            ctx.fillStyle = getComputedStyle(el).color
            ctx.fillRect(0, 0, 1, 1)
            const fg = pixel()
            const a = luminance(fg),
              b = luminance(bg)
            return {
              text: el.textContent.trim().slice(0, 35),
              ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
            }
          })
      })
      assert.ok(
        contrasts.every((item) => item.ratio >= 4.5),
        mode +
          ' ' +
          path +
          ' text contrast ' +
          JSON.stringify(contrasts.filter((item) => item.ratio < 4.5)),
      )
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          mode + ' ' + width + ' ' + path,
        )
        if (path === '/admin/content' && (width === 390 || width === 1440)) {
          if (screenshotPrefix)
            await page.screenshot({
              path:
                screenshotPrefix +
                '-' +
                mode.toLowerCase() +
                '-' +
                (width === 390 ? 'mobile' : 'desktop') +
                '.png',
              fullPage: true,
            })
        }
      }
    }
  }
  await createPage()
  await title().fill('Logout bypass')
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.waitForURL(/\/admin\/login/)
  assert.equal(await page.getByRole('alertdialog').count(), 0)
  assert.deepEqual(errors, [])
  const isolated = await browser.newContext()
  await isolated.addCookies([
    {
      name: 'browser-fixture',
      value: 'admin',
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  await isolated.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw Error('unavailable')
      },
    })
  })
  const storagePage = await isolated.newPage()
  await storagePage.goto(baseURL + '/admin')
  await storagePage
    .getByRole('heading', { name: 'Dashboard', exact: true })
    .waitFor()
  await isolated.close()
  console.log(
    'Browser: content list/create/detail/edit, three real PostgreSQL resources, version race, errors/input retention, dirty navigation/logout, Light/Dark/System and responsive layouts passed',
  )
  await context.close()
} finally {
  await browser.close()
}
