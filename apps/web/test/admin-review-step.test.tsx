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
import { ReviewStep } from '../src/components/admin/setup/review-step'
import type { ContentDetail } from '../src/lib/admin/content-client'
import { publicationCheckCodes } from '../src/lib/admin/publication-client'
import { AdminSessionContext } from '../src/lib/auth/session-context'
import { inventoryFixture, mediaOwnerId } from './admin-media-fixture'

const id = mediaOwnerId
const detail = (rightsConfirmedAt: string | null) =>
  ({
    type: 'film',
    data: {
      id,
      kind: 'movie',
      title: 'Midnight Harbor',
      rowVersion: 1,
      publicationStatus: 'draft',
      archivedAt: null,
      rightsConfirmedAt,
    },
  }) as unknown as ContentDetail

function publication(blocked: string[] = [], canPreview = true) {
  const checks = publicationCheckCodes.map((code) => ({
    code,
    status:
      code === 'ACTIVE_PARENTS'
        ? 'not-applicable'
        : blocked.includes(code)
          ? 'blocked'
          : 'passed',
  }))
  return {
    controller: {},
    state: { phase: 'idle' },
    online: true,
    readiness: {
      data: {
        videoId: id,
        kind: 'movie',
        rowVersion: 1,
        publicationStatus: 'draft',
        archivedAt: null,
        canPublish: blocked.length === 0,
        checks,
      },
      isPending: false,
      isError: false,
      isFetching: false,
      error: null,
    },
    media: {
      data: { ...inventoryFixture(), canPreview },
      isPending: false,
      isError: false,
      isFetching: false,
      error: null,
    },
  } as never
}
async function render(
  pub: ReturnType<typeof publication>,
  rights: string | null = null,
) {
  const root = createRootRoute()
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => (
      <QueryClientProvider client={new QueryClient()}>
        <AdminSessionContext value={{ user: { id: 'admin-1' } } as never}>
          <ReviewStep
            detail={detail(rights)}
            type="film"
            metadataStale={false}
            publication={pub}
            localBusy={false}
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

test('a ready draft shows the preview, an all-set checklist and a locked Publish button until rights are confirmed', async () => {
  const html = await render(publication())
  expect(html).toContain('Before you publish')
  expect(html).toContain('All set')
  expect(html).toContain('Title provided')
  expect(html).toContain('Verified video and cover ready')
  expect(html).toContain('Preview is visible only to you.')
  expect(html).toContain(
    'I have the rights to publish this video and I&#x27;ve watched the preview.',
  )
  expect(html).toMatch(/<button[^>]*disabled[^>]*>Publish video<\/button>/)
  expect(html).toContain('Save as draft')
  expect(html).not.toContain('Preview isn&#x27;t ready')
})

test('missing media links back to the Media step and keeps Publish disabled', async () => {
  const html = await render(publication(['VERIFIED_MEDIA'], false))
  expect(html).toContain('Not ready')
  expect(html).toContain('Go to media')
  expect(html).toContain(`/admin/content/film/${id}/setup?step=media`)
  expect(html).toContain('Preview isn&#x27;t ready')
  expect(html).toMatch(/<button[^>]*disabled[^>]*>Publish video<\/button>/)
})

test('missing details link to the edit form, and rights are asked at publish time instead', async () => {
  const html = await render(publication(['SYNOPSIS', 'RIGHTS']))
  expect(html).toContain('Edit details')
  expect(html).toContain(`/admin/content/film/${id}/edit`)
  expect(html).toContain('Confirm below when you publish.')
})

test('when rights were already confirmed the checkbox only covers the preview', async () => {
  const html = await render(publication(), '2026-10-10T00:00:00.000Z')
  expect(html).toContain(
    'I&#x27;ve watched the preview and want to publish this video.',
  )
  expect(html).not.toContain('I have the rights to publish')
})
