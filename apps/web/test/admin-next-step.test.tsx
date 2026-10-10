import { expect, test } from 'bun:test'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { ContentNextStep } from '../src/components/admin/content-next-step'
import type { ContentItem } from '../src/lib/admin/content-client'
import { isOpenDraft, nextStep, nextStepHref } from '../src/lib/admin/next-step'

const item = (over: Partial<ContentItem> = {}): ContentItem =>
  ({
    id: '00000000-0000-4000-8000-0000000000aa',
    type: 'film',
    title: 'Midnight Harbor',
    publicationStatus: 'draft',
    archivedAt: null,
    ...over,
  }) as ContentItem

test('every row has exactly one next step derived from its editorial state', () => {
  expect(nextStep(item())).toMatchObject({ kind: 'setup', primary: true })
  expect(nextStep(item({ type: 'standalone' }))).toMatchObject({
    kind: 'setup',
  })
  expect(nextStep(item({ type: 'series' }))).toMatchObject({
    kind: 'seasons',
    label: 'Manage episodes',
  })
  expect(nextStep(item({ publicationStatus: 'published' }))).toMatchObject({
    kind: 'view',
    hint: 'Live',
    primary: false,
  })
  expect(
    nextStep(item({ archivedAt: '2026-10-10T00:00:00.000Z' })),
  ).toMatchObject({ kind: 'view', hint: 'Archived' })
  // Archived wins over a draft or published status.
  expect(
    nextStep(
      item({
        publicationStatus: 'draft',
        archivedAt: '2026-10-10T00:00:00.000Z',
      }),
    ).kind,
  ).toBe('view')
  expect(isOpenDraft(item())).toBe(true)
  expect(isOpenDraft(item({ publicationStatus: 'published' }))).toBe(false)
})

test('next steps open the stepper, the seasons page or the detail page', () => {
  const film = item()
  expect(nextStepHref(film)).toBe(`/admin/content/film/${film.id}/setup`)
  const series = item({ type: 'series' })
  expect(nextStepHref(series)).toBe(`/admin/series/${series.id}/seasons`)
  const live = item({ publicationStatus: 'published' })
  expect(nextStepHref(live)).toBe(`/admin/content/film/${live.id}`)
})

async function render(value: ContentItem) {
  const root = createRootRoute()
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <ContentNextStep item={value} />,
  })
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return renderToString(<RouterProvider router={router} />).replaceAll(
    '<!-- -->',
    '',
  )
}

test('draft rows offer Continue setup plus Details, and name the title for screen readers', async () => {
  const value = item()
  const html = await render(value)
  expect(html).toContain('Continue setup')
  expect(html).toContain(`href="/admin/content/film/${value.id}/setup"`)
  expect(html).toContain('Details')
  expect(html).toContain('Midnight Harbor')
  expect(html).not.toContain('>Edit')
})

test('series drafts go to seasons; live and archived rows only offer View', async () => {
  const series = item({ type: 'series' })
  const seriesHtml = await render(series)
  expect(seriesHtml).toContain('Manage episodes')
  expect(seriesHtml).toContain(`href="/admin/series/${series.id}/seasons"`)

  const live = await render(item({ publicationStatus: 'published' }))
  expect(live).toContain('View')
  expect(live).not.toContain('Continue setup')
  expect(live).not.toContain('Details')
})
