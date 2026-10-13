import { expect, test } from 'bun:test'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContentRowActions } from '../src/components/admin/content-row-actions'
import { AdminSessionContext } from '../src/lib/auth/session-context'
import { rowActions } from '../src/lib/admin/row-actions'
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
    component: () => <ContentRowActions item={value} />,
  })
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <AdminSessionContext value={{ user: { id: 'admin-1' } } as never}>
        <RouterProvider router={router} />
      </AdminSessionContext>
    </QueryClientProvider>,
  ).replaceAll('<!-- -->', '')
}

test('a draft row has one primary action and a named menu; nothing else is visible', async () => {
  const value = item()
  const html = await render(value)
  expect(html).toContain('Continue setup')
  expect(html).toContain(`href="/admin/content/film/${value.id}/setup"`)
  expect(html).toContain('aria-label="Actions for Midnight Harbor"')
  // Secondary actions stay inside the closed menu.
  expect(html).not.toContain('Details')
  expect(html).not.toContain('Edit draft')
  expect(html).not.toContain('Delete')
  expect(html.match(/<a /g)).toHaveLength(1)
})

test('series drafts go to seasons; live and archived rows offer View', async () => {
  const series = item({ type: 'series' })
  const seriesHtml = await render(series)
  expect(seriesHtml).toContain('Manage episodes')
  expect(seriesHtml).toContain(`href="/admin/series/${series.id}/seasons"`)

  const live = await render(item({ publicationStatus: 'published' }))
  expect(live).toContain('View')
  expect(live).not.toContain('Continue setup')
})

test('menu contents follow the row state: details and edit for drafts, delete always last', () => {
  const draft = rowActions(item())
  expect(draft).toMatchObject({ details: true, edit: true })
  expect(draft.deleteBlock).toBeUndefined()
  expect(draft.deleteTarget).toMatchObject({
    kind: 'movie',
    title: 'Midnight Harbor',
  })
  expect(rowActions(item({ type: 'series' })).deleteTarget.kind).toBe('series')

  const live = rowActions(item({ publicationStatus: 'published' }))
  expect(live).toMatchObject({ details: false, edit: false })
  expect(live.deleteBlock).toContain('Archive it first')

  const archived = rowActions(
    item({
      archivedAt: '2026-10-10T00:00:00.000Z',
      publicationStatus: 'published',
    }),
  )
  expect(archived).toMatchObject({ details: false, edit: false })
  expect(archived.deleteBlock).toBeUndefined()
})
