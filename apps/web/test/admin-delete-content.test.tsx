import { expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { DeleteContent } from '../src/components/admin/delete-content'
import {
  DeleteApiError,
  createDeleteClient,
  deleteFailure,
} from '../src/lib/admin/delete-client'
import {
  deleteBlock,
  deleteConsequences,
  deleteSummaryText,
  requiresTypedTitle,
  titleMatches,
} from '../src/lib/admin/delete-state'
import type { DeleteTarget } from '../src/lib/admin/delete-state'
import { AdminSessionContext } from '../src/lib/auth/session-context'

const id = '6f009a09-3d1c-4697-b6d5-3c2ab4c93e4c'
const summary = {
  series: 0,
  seasons: 0,
  videos: 1,
  assets: 2,
  uploadSessions: 2,
  jobs: 2,
  storageObjects: 6,
}
const target = (patch: Partial<DeleteTarget> = {}): DeleteTarget => ({
  kind: 'movie',
  id,
  title: 'A Film',
  version: 3,
  publicationStatus: 'draft',
  archivedAt: null,
  ...patch,
})
const strip = (html: string) => html.replaceAll('<!-- -->', '')
function render(value: DeleteTarget, compact = false) {
  return strip(
    renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <AdminSessionContext value={{ user: { id: 'admin-1' } } as never}>
          <DeleteContent target={value} compact={compact} />
        </AdminSessionContext>
      </QueryClientProvider>,
    ),
  )
}

test('only published, non-archived content is blocked from deletion', () => {
  expect(deleteBlock(target())).toBeUndefined()
  expect(
    deleteBlock(target({ publicationStatus: 'archived', archivedAt: 'x' })),
  ).toBeUndefined()
  expect(
    deleteBlock(target({ publicationStatus: 'unpublished' })),
  ).toBeUndefined()
  expect(deleteBlock(target({ publicationStatus: 'published' }))).toContain(
    'Archive it first',
  )
  expect(
    deleteBlock(target({ kind: 'series', publicationStatus: 'published' })),
  ).toContain('series')
  // Seasons have no status of their own; the server decides.
  expect(
    deleteBlock(target({ kind: 'season', publicationStatus: 'published' })),
  ).toBeUndefined()
})
test('series need the title typed, and consequences name what goes with them', () => {
  expect(requiresTypedTitle('series')).toBe(true)
  for (const kind of ['movie', 'standalone', 'episode', 'season'] as const)
    expect(requiresTypedTitle(kind)).toBe(false)
  expect(titleMatches('Neon Garden', '  Neon Garden ')).toBe(true)
  expect(titleMatches('Neon Garden', 'neon garden')).toBe(false)
  expect(deleteConsequences('series').join(' ')).toContain(
    'seasons and episodes',
  )
  expect(deleteConsequences('season').join(' ')).toContain('episodes')
  expect(deleteConsequences('movie').join(' ')).toContain('cannot be undone')
  expect(deleteSummaryText('A Film', summary)).toBe(
    'Deleted “A Film” (1 video, 2 media files).',
  )
  expect(deleteSummaryText('X', { ...summary, videos: 0, assets: 0 })).toBe(
    'Deleted “X”.',
  )
})
test('the delete button is a 44 px destructive control; published content explains why it is disabled', () => {
  const draft = render(target())
  expect(draft).toContain('Delete film')
  expect(draft).toContain('min-h-11')
  expect(draft).not.toContain('aria-disabled')
  const published = render(target({ publicationStatus: 'published' }))
  expect(published).toContain('aria-disabled="true"')
  expect(published).toContain('Archive it first')
  expect(published).toMatch(/aria-describedby="[^"]+"/)
  const compact = render(target({ publicationStatus: 'published' }), true)
  expect(compact).toContain('sr-only')
  // The confirmation dialog stays closed until requested.
  expect(draft).not.toContain('Delete “A Film”?')
})

function client(responder: (request: Request) => Response) {
  const requests: Request[] = []
  return {
    requests,
    api: createDeleteClient(
      'http://api.test',
      new QueryClient(),
      async (input, init) => {
        const request = new Request(input, init)
        requests.push(request)
        return responder(request)
      },
    ),
  }
}
test('the delete client sends DELETE with the expected version and validates the answer', async () => {
  const ok = client(() =>
    Response.json({ id, kind: 'movie', removed: summary }),
  )
  expect((await ok.api.video(id, 3)).removed.assets).toBe(2)
  expect(ok.requests[0].method).toBe('DELETE')
  const url = new URL(ok.requests[0].url)
  expect(url.pathname).toBe(`/admin/videos/${id}`)
  expect(url.searchParams.get('expectedVersion')).toBe('3')

  const seasons = client(() =>
    Response.json({ id, kind: 'season', removed: summary }),
  )
  await seasons.api.season(id, 2)
  expect(new URL(seasons.requests[0].url).pathname).toBe(`/admin/seasons/${id}`)
  const series = client(() =>
    Response.json({ id, kind: 'series', removed: summary }),
  )
  await series.api.series(id, 1)
  expect(new URL(series.requests[0].url).pathname).toBe(`/admin/series/${id}`)

  for (const body of [
    { id: 'other', kind: 'movie', removed: summary },
    { id, kind: 'series', removed: summary },
    { id, kind: 'movie', removed: { ...summary, assets: -1 } },
    { id, kind: 'movie' },
  ])
    await expect(
      client(() => Response.json(body)).api.video(id, 3),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})
test('server refusals become readable messages and unconfirmed outcomes are flagged', async () => {
  const refuse = (status: number, code: string) =>
    client(() =>
      Response.json({ error: { code, message: 'x' } }, { status }),
    ).api.video(id, 3)
  for (const [status, code, text] of [
    [409, 'CONTENT_BUSY', 'still running'],
    [409, 'CONTENT_STATE_CONFLICT', 'Archive it first'],
    [409, 'CONTENT_VERSION_CONFLICT', 'has changed'],
    [404, 'CONTENT_NOT_FOUND', 'already been deleted'],
  ] as const) {
    const error = await refuse(status, code).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DeleteApiError)
    expect(deleteFailure(error)).toMatchObject({ code, unconfirmed: false })
    expect(deleteFailure(error).message).toContain(text)
  }
  const outage = await refuse(503, 'CONTENT_DEPENDENCY_UNAVAILABLE').catch(
    (e: unknown) => e,
  )
  expect(deleteFailure(outage).unconfirmed).toBe(true)
  expect(deleteFailure(new Error('boom'))).toMatchObject({
    code: 'DELETE_REQUEST_FAILED',
    unconfirmed: true,
  })
})
