import { expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { GenresManager } from '../src/components/admin/genres/genres-manager'
import { submitGenre } from '../src/lib/admin/genres-actions'
import { GenresApiError } from '../src/lib/admin/genres-client'
import type { GenresClient } from '../src/lib/admin/genres-client'
import { genreListOptions } from '../src/lib/admin/genres-queries'
import { memoryGenresClient } from './fixtures/genres-memory-client'

// React separates adjacent text nodes with comment markers during SSR.
const stripMarkers = (html: string) => html.replaceAll('<!-- -->', '')

async function render(
  client: GenresClient | undefined,
  options: { online?: boolean; prefetch?: boolean } = {},
) {
  const cache = new QueryClient()
  if (options.prefetch !== false)
    await cache
      .fetchInfiniteQuery(genreListOptions(client, 'admin-1', ''))
      .catch(() => undefined)
  return stripMarkers(
    renderToString(
      <QueryClientProvider client={cache}>
        <GenresManager
          client={client}
          identity="admin-1"
          online={options.online ?? true}
        />
      </QueryClientProvider>,
    ),
  )
}

test('lists genres with slug and creation date, and a labelled add form', async () => {
  const { client } = memoryGenresClient([
    { name: 'Drama' },
    { name: 'Sci-Fi & Fantasy' },
  ])
  const html = await render(client)
  expect(html).toContain('Genres')
  expect(html).toContain('Drama')
  expect(html).toContain('sci-fi-fantasy')
  expect(html).toContain('2026-10-10')
  expect(html).toContain('Showing 2 genres')
  expect(html).toContain('for="genre-name"')
  expect(html).toContain('for="genre-slug"')
  expect(html).toContain('Add genre')
})

test('rename and delete are disabled with an explanation while the API cannot edit', async () => {
  const { client } = memoryGenresClient([{ name: 'Drama' }], { canEdit: false })
  const html = await render(client)
  expect(html).toContain(
    'Renaming and deleting genres isn&#x27;t available yet.',
  )
  expect(
    html.match(
      /disabled=""[^>]*aria-label="(Rename|Delete) Drama"|aria-label="(Rename|Delete) Drama"[^>]*disabled=""/g,
    ),
  ).toHaveLength(2)
  const enabled = await render(
    memoryGenresClient([{ name: 'Drama' }], { canEdit: true }).client,
  )
  expect(enabled).not.toContain('available yet')
})

test('empty, loading, error and offline states are announced without hiding the form', async () => {
  const empty = await render(memoryGenresClient([]).client)
  expect(empty).toContain('No genres yet')
  expect(empty).toContain('Add genre')

  const loading = await render(memoryGenresClient([]).client, {
    prefetch: false,
  })
  expect(loading).toContain('Loading genres')

  const failing: GenresClient = {
    ...memoryGenresClient([]).client,
    list: () => Promise.reject(new GenresApiError(503, 'X', 'raw server text')),
  }
  const failed = await render(failing)
  expect(failed).toContain('Genres could not be loaded')
  expect(failed).toContain('Retry')
  expect(failed).not.toContain('raw server text')
  expect(failed).toContain('Add genre')

  const offline = await render(memoryGenresClient([{ name: 'Drama' }]).client, {
    online: false,
  })
  expect(offline).toContain('You are offline')
  expect(offline).toContain('Drama')
})

test('more pages are offered through an explicit Load more button', async () => {
  const { client } = memoryGenresClient(
    [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    { pageSize: 2 },
  )
  const html = await render(client)
  expect(html).toContain('Showing 2 genres so far')
  expect(html).toContain('Load more genres')
})

test('submitGenre validates first, then sends one request and classifies the outcome', async () => {
  const { client, calls, rows } = memoryGenresClient([{ name: 'Drama' }])
  const save = (input: { name: string; slug?: string }) => client.create(input)
  const values = { name: '', slug: '', slugTouched: false }

  const invalid = await submitGenre(save, values)
  expect(invalid).toEqual({
    status: 'invalid',
    nameError: 'Enter a genre name.',
    slugError: undefined,
  })
  expect(calls).toEqual([])

  const saved = await submitGenre(save, { ...values, name: ' Thriller ' })
  expect(saved.status).toBe('saved')
  expect(calls).toEqual(['create:Thriller'])
  expect(rows.map((row) => row.slug)).toContain('thriller')

  const conflict = await submitGenre(save, {
    name: 'Another',
    slug: 'drama',
    slugTouched: true,
  })
  expect(conflict).toMatchObject({ status: 'failed', unconfirmed: false })
  expect(conflict.status === 'failed' && conflict.slugError).toContain('slug')

  const lost = await submitGenre(
    () => Promise.reject(new GenresApiError(0, 'NETWORK', 'raw')),
    { ...values, name: 'Western' },
  )
  expect(lost).toMatchObject({ status: 'failed', unconfirmed: true })
  expect(lost.status === 'failed' && lost.message).toContain(
    'could not be confirmed',
  )
  expect(lost.status === 'failed' && lost.message).not.toContain('raw')
})
