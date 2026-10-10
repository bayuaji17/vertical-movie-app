import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isNotFound,
} from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { NotFoundPage } from '../src/components/not-found-page'
import { Route as titlesRoute } from '../src/routes/titles.$kind.$slug'
import { isMissingContent } from '../src/lib/public/missing-content'

async function renderNotFound(path: string) {
  const root = createRootRoute()
  const index = createRoute({ getParentRoute: () => root, path: '/' })
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultNotFoundComponent: NotFoundPage,
  })
  await router.load()
  return renderToString(<RouterProvider router={router} />)
}

test('unknown public and admin paths render the same single 404 page with one home link', async () => {
  const [publicHtml, adminHtml] = await Promise.all([
    renderNotFound('/nope'),
    renderNotFound('/admin/anything/else'),
  ])
  expect(publicHtml).toBe(adminHtml)
  expect(publicHtml).toContain('Page not found')
  expect(publicHtml).toContain('id="main-content"')
  expect(publicHtml).toContain('noindex, nofollow')
  expect(publicHtml.match(/<h1/g)).toHaveLength(1)
  expect(publicHtml.match(/<a /g)).toHaveLength(1)
  expect(publicHtml).toContain('href="/"')
  expect(publicHtml).toContain('Back to home')
})

test('requested path and markup are never reflected into the 404 page', async () => {
  const html = await renderNotFound('/%3Cscript%3Ealert(1)%3C%2Fscript%3E')
  expect(html).not.toContain('alert(1)')
  expect(html).not.toContain('script%3E')
})

test('only 404 and 422 count as missing content; outages keep their retry UI', () => {
  expect(isMissingContent(404)).toBe(true)
  expect(isMissingContent(422)).toBe(true)
  for (const status of [null, undefined, 200, 401, 500, 503])
    expect(isMissingContent(status)).toBe(false)
})

test('title route rejects unknown kinds and malformed slugs with notFound() before any request', async () => {
  const run = (kind: string, slug: string) =>
    (titlesRoute.options.loader as (context: never) => Promise<unknown>)({
      context: { queryClient: new QueryClient() },
      params: { kind, slug },
    } as never)
  for (const [kind, slug] of [
    ['series', 'a-title'],
    ['movie', 'Not A Slug!'],
  ]) {
    const error = await run(kind, slug).then(
      () => undefined,
      (e: unknown) => e,
    )
    expect(isNotFound(error)).toBe(true)
  }
})
