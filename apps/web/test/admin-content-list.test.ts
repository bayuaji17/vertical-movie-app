import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { createContentClient } from '../src/lib/admin/content-client'
import { contentListOptions } from '../src/lib/admin/content-queries'
import {
  activeFilterCount,
  ariaSort,
  clearedFilters,
  contentSearch,
  contentSearchDefaults,
  defaultOrder,
  effectiveOrder,
  isFiltered,
  pageNumbers,
  pageRange,
  sortPatch,
} from '../src/lib/admin/content-list-state'

test('URL state normalizes only supported values and page size boundaries', () => {
  expect(
    contentSearch({
      type: 'episode',
      page: -2,
      pageSize: 101,
      includeArchived: 'false',
      status: 'everything',
      sort: 'size',
      order: 'up',
    }),
  ).toEqual({
    type: 'film',
    search: '',
    status: 'active',
    sort: 'updated',
    order: undefined,
    page: 1,
    pageSize: 10,
  })
  expect(
    contentSearch({
      type: 'series',
      page: '14',
      pageSize: '3',
      status: 'draft',
      sort: 'title',
      order: 'desc',
    }),
  ).toEqual({
    type: 'series',
    search: '',
    status: 'draft',
    sort: 'title',
    order: 'desc',
    page: 14,
    pageSize: 3,
  })
  expect(contentSearch({ pageSize: '1.5' }).pageSize).toBe(10)
  expect(contentSearch({ search: 'a'.repeat(201) }).search).toHaveLength(200)
})
test('links saved before the status filter keep working', () => {
  expect(contentSearch({ includeArchived: 'true' }).status).toBe('all')
  expect(contentSearch({ includeArchived: true }).status).toBe('all')
  expect(contentSearch({ includeArchived: 'false' }).status).toBe('active')
  // A real status wins over the old flag.
  expect(
    contentSearch({ includeArchived: 'true', status: 'draft' }).status,
  ).toBe('draft')
})
test('the natural order of a sort is not kept in the URL', () => {
  expect(defaultOrder('updated')).toBe('desc')
  expect(defaultOrder('created')).toBe('desc')
  expect(defaultOrder('title')).toBe('asc')
  expect(defaultOrder('status')).toBe('asc')
  expect(contentSearch({ sort: 'title', order: 'asc' }).order).toBeUndefined()
  expect(
    contentSearch({ sort: 'updated', order: 'desc' }).order,
  ).toBeUndefined()
  expect(contentSearch({ sort: 'updated', order: 'asc' }).order).toBe('asc')
  expect(effectiveOrder({ sort: 'title', order: undefined })).toBe('asc')
  expect(effectiveOrder({ sort: 'updated', order: 'asc' })).toBe('asc')
})
test('choosing a column sorts by it and choosing it again reverses it', () => {
  const base = contentSearch({ page: 3, search: 'rain' })
  // A new column starts at its natural order and goes back to page 1.
  expect(sortPatch(base, 'title')).toEqual({
    sort: 'title',
    order: undefined,
    page: 1,
  })
  const byTitle = contentSearch({ sort: 'title' })
  expect(sortPatch(byTitle, 'title')).toEqual({ order: 'desc', page: 1 })
  // Reversing twice returns to the natural order, which is not stored.
  const reversed = contentSearch({ sort: 'title', order: 'desc' })
  expect(sortPatch(reversed, 'title')).toEqual({ order: undefined, page: 1 })
  expect(sortPatch(contentSearch({}), 'updated')).toEqual({
    order: 'asc',
    page: 1,
  })
  expect(ariaSort(byTitle, 'title')).toBe('ascending')
  expect(ariaSort(reversed, 'title')).toBe('descending')
  expect(ariaSort(byTitle, 'updated')).toBeUndefined()
})
test('filtered state and the mobile filter count follow non-default choices', () => {
  const none = contentSearch({})
  expect(isFiltered(none)).toBe(false)
  expect(activeFilterCount(none)).toBe(0)
  expect(isFiltered(contentSearch({ search: 'x' }))).toBe(true)
  expect(isFiltered(contentSearch({ status: 'archived' }))).toBe(true)
  expect(activeFilterCount(contentSearch({ status: 'draft' }))).toBe(1)
  expect(
    activeFilterCount(contentSearch({ status: 'draft', sort: 'title' })),
  ).toBe(2)
  expect(activeFilterCount(contentSearch({ order: 'asc' }))).toBe(1)
  const merged = {
    ...contentSearch({ status: 'draft', search: 'x', page: 4 }),
    ...clearedFilters,
  }
  expect(merged).toMatchObject({
    status: 'active',
    search: '',
    sort: 'updated',
    page: 1,
  })
  expect(contentSearchDefaults.status).toBe('active')
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
    status: 'active',
    sort: 'updated',
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
