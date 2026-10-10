import { expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { ContentForm } from '../src/components/admin/content-form'
import { emptyContentValues } from '../src/lib/admin/content-form-state'
import { AdminSessionContext } from '../src/lib/auth/session-context'

async function render(variant?: 'quick' | 'full') {
  const root = createRootRoute()
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => (
      <QueryClientProvider client={new QueryClient()}>
        <AdminSessionContext value={{ user: { id: 'admin-1' } } as never}>
          <ContentForm
            initialValues={emptyContentValues()}
            onSubmit={() => Promise.resolve()}
            onDirtyChange={() => undefined}
            variant={variant}
          />
        </AdminSessionContext>
      </QueryClientProvider>
    ),
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

test('quick variant asks only for type and title and tucks the rest into optional details', async () => {
  const html = await render('quick')
  expect(html).toContain('What are you adding?')
  for (const label of ['Film', 'Standalone', 'Series'])
    expect(html).toContain(label)
  expect(html.match(/type="radio"/g)).toHaveLength(3)
  expect(html).toContain('for="title"')
  expect(html).toContain('Save &amp; continue')
  expect(html).toContain('More details')
  expect(html).toMatch(/<details(?![^>]*\bopen\b)/)
  // Rights are confirmed later, at the review step.
  expect(html).not.toContain('rightsConfirmed')
  expect(html).not.toContain('Create draft')
  // Optional fields stay available inside the details section.
  expect(html).toContain('for="synopsis"')
  expect(html).toContain('Search genres')
})

test('full variant keeps the complete form with rights and Create draft', async () => {
  const html = await render()
  expect(html).toContain('Basic information')
  expect(html).toContain('Classification')
  expect(html).toContain('rightsConfirmed')
  expect(html).toContain('Create draft')
  expect(html).not.toContain('What are you adding?')
  expect(html).not.toContain('More details')
})
