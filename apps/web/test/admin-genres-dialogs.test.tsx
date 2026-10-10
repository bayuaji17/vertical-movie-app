import { expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import {
  DeleteGenreContent,
  RenameGenreForm,
} from '../src/components/admin/genres/genre-dialogs'
import { AlertDialog } from '../src/components/ui/alert-dialog'
import { Dialog } from '../src/components/ui/dialog'
import {
  renameInput,
  submitRemove,
  submitRename,
} from '../src/lib/admin/genres-actions'
import { GenresApiError } from '../src/lib/admin/genres-client'
import { memoryGenresClient } from './fixtures/genres-memory-client'

const strip = (html: string) => html.replaceAll('<!-- -->', '')
const drama = {
  id: '00000000-0000-4000-8000-0000000000aa',
  name: 'Drama',
  slug: 'drama',
  createdAt: '2026-10-10T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
}

test('rename form is prefilled, labelled and warns that slug changes affect links', () => {
  const { client } = memoryGenresClient()
  const html = strip(
    renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <Dialog open>
          <RenameGenreForm
            genre={drama}
            client={client}
            identity="admin-1"
            onDone={() => undefined}
          />
        </Dialog>
      </QueryClientProvider>,
    ),
  )
  expect(html).toContain('Rename genre')
  expect(html).toContain('for="rename-genre-name"')
  expect(html).toContain('value="Drama"')
  expect(html).toContain('value="drama"')
  expect(html).toContain('Changing the slug changes public links')
  expect(html).toContain('Save changes')
})

test('delete confirmation names the genre and states the in-use rule', () => {
  const { client } = memoryGenresClient()
  const html = strip(
    renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <AlertDialog open>
          <DeleteGenreContent
            genre={drama}
            client={client}
            identity="admin-1"
            onDone={() => undefined}
          />
        </AlertDialog>
      </QueryClientProvider>,
    ),
  )
  expect(html).toContain('Delete “Drama”?')
  expect(html).toContain('can&#x27;t be deleted')
  expect(html).toContain('Delete genre')
  expect(html).toContain('Cancel')
})

test('rename sends only what changed and rejects no-op, invalid and conflicting input', async () => {
  const { client, calls, rows } = memoryGenresClient([
    { name: 'Drama', id: drama.id },
    { name: 'Comedy' },
  ])
  const save = (id: string, input: { name: string; slug?: string }) =>
    client.rename(id, input)
  const same = { name: 'Drama', slug: 'drama', slugTouched: true }

  expect(renameInput(drama, same)).toEqual({ name: 'Drama' })
  expect(
    renameInput(drama, { ...same, name: ' Dramas ', slug: 'dramas' }),
  ).toEqual({ name: 'Dramas', slug: 'dramas' })

  expect(await submitRename(drama, save, same)).toMatchObject({
    status: 'invalid',
    nameError: 'Change the name or slug first.',
  })
  expect(await submitRename(drama, save, { ...same, name: ' ' })).toMatchObject(
    { status: 'invalid', nameError: 'Enter a genre name.' },
  )
  expect(
    await submitRename(drama, save, { ...same, slug: 'Bad Slug' }),
  ).toMatchObject({ status: 'invalid' })
  expect(calls).toEqual([])

  expect(
    await submitRename(drama, save, { ...same, slug: 'comedy' }),
  ).toMatchObject({ status: 'failed', unconfirmed: false })

  const saved = await submitRename(drama, save, { ...same, name: 'Dramas' })
  expect(saved.status).toBe('saved')
  expect(rows.find((row) => row.id === drama.id)?.name).toBe('Dramas')
})

test('delete reports in-use, missing and unconfirmed outcomes without retrying', async () => {
  const { client, calls, rows } = memoryGenresClient(
    [{ name: 'Drama', id: drama.id }],
    { inUse: [drama.id] },
  )
  const used = await submitRemove((id) => client.remove(id), drama)
  expect(used).toMatchObject({ status: 'failed', inUse: true })
  expect(used.status === 'failed' && used.message).toContain('used by content')
  expect(rows).toHaveLength(1)

  const free = memoryGenresClient([{ name: 'Drama', id: drama.id }])
  expect(await submitRemove((id) => free.client.remove(id), drama)).toEqual({
    status: 'removed',
  })
  expect(free.rows).toHaveLength(0)

  const lost = await submitRemove(
    () => Promise.reject(new GenresApiError(0, 'NETWORK', 'raw')),
    drama,
  )
  expect(lost).toMatchObject({ status: 'failed', unconfirmed: true })
  expect(calls).toEqual([`remove:${drama.id}`])
})

test('with canEdit=false the adapter refuses edits so no state is faked', async () => {
  const { client } = memoryGenresClient([{ name: 'Drama', id: drama.id }], {
    canEdit: false,
  })
  const outcome = await submitRemove((id) => client.remove(id), drama)
  expect(outcome).toMatchObject({ status: 'failed', unconfirmed: false })
  expect(outcome.status === 'failed' && outcome.message).toContain(
    "isn't available",
  )
})
