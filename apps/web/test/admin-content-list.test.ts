import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { createContentClient } from '../src/lib/admin/content-client'
import { contentListOptions } from '../src/lib/admin/content-queries'
import {
  contentSearch,
  pageNumbers,
  pageRange,
} from '../src/lib/admin/content-list-state'

test('URL state normalizes only supported types and page size boundaries', () => {
  expect(
    contentSearch({
      type: 'episode',
      page: -2,
      pageSize: 101,
      includeArchived: 'false',
    }),
  ).toEqual({
    type: 'film',
    search: '',
    page: 1,
    pageSize: 10,
    includeArchived: false,
  })
  expect(
    contentSearch({
      type: 'series',
      page: '14',
      pageSize: '3',
      includeArchived: 'true',
    }),
  ).toEqual({
    type: 'series',
    search: '',
    page: 14,
    pageSize: 3,
    includeArchived: true,
  })
  expect(contentSearch({ pageSize: '1.5' }).pageSize).toBe(10)
  expect(contentSearch({ search: 'a'.repeat(201) }).search).toHaveLength(200)
})
test('pagination gives bounded pages and accurate empty/last-page/custom ranges', () => {
  expect(pageNumbers(7, 14)).toEqual([1, 6, 7, 8, 14])
  expect(pageNumbers(1, 0)).toEqual([])
  expect(pageNumbers(1, 2)).toEqual([1, 2])
  expect(pageRange(42, 14, 3, 3)).toEqual({ start: 40, end: 42 })
  expect(pageRange(42, 5, 10, 2)).toEqual({ start: 41, end: 42 })
  expect(pageRange(42, 6, 10, 0)).toEqual({ start: 0, end: 0 })
})
test('pending filter requests cancel and never populate another filter cache', async () => {
  const cache = new QueryClient()
  const first = {
    type: 'film',
    search: 'old',
    includeArchived: false,
    page: 1,
    pageSize: 10,
  } as const
  const second = { ...first, search: 'new' }
  let heldSignal: AbortSignal | undefined
  const api = createContentClient(
    'http://localhost/api',
    cache,
    async (url, init) => {
      if (new URL(String(url)).searchParams.get('search') === 'old') {
        heldSignal = init?.signal ?? undefined
        return await new Promise<Response>((_, reject) =>
          heldSignal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        )
      }
      return Response.json({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      })
    },
  )
  const pending = cache
    .fetchQuery(contentListOptions(api, 'identity', first))
    .catch(() => undefined)
  await cache.cancelQueries({
    queryKey: contentListOptions(api, 'identity', first).queryKey,
  })
  await cache.fetchQuery(contentListOptions(api, 'identity', second))
  await pending
  expect(heldSignal?.aborted).toBe(true)
  expect(
    cache.getQueryData(contentListOptions(api, 'identity', first).queryKey),
  ).toBeUndefined()
  expect(
    cache.getQueryData(contentListOptions(api, 'identity', second).queryKey)
      ?.total,
  ).toBe(0)
})
