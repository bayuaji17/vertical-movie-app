import { test, expect } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  clearAdminPrivateQueries,
  clearAdminDataQueries,
} from '../src/lib/auth/session-cache'
import {
  createContentOptions,
  patchContentOptions,
} from '../src/lib/admin/content-queries'

test('private mutation payloads/results disappear even when a pending mutation settles after logout', async () => {
  const cache = new QueryClient()
  let release!: (value: string) => void
  const mutation = cache.getMutationCache().build(cache, {
    mutationKey: ['admin', 'principal', 'content', 'create'],
    retry: false,
    mutationFn: async (_input: string) =>
      new Promise<string>((resolve) => {
        release = resolve
      }),
  })
  cache.getMutationCache().build(cache, { mutationKey: ['public', 'mutation'] })
  const pending = mutation.execute('private draft')
  await Bun.sleep(1)
  expect(mutation.state.variables).toBe('private draft')
  await clearAdminPrivateQueries(cache)
  expect(cache.getMutationCache().getAll()).toHaveLength(1)
  release('private confirmed result')
  await pending
  expect(cache.getMutationCache().getAll()).toHaveLength(1)
  expect(cache.getMutationCache().getAll()[0].options.mutationKey).toEqual([
    'public',
    'mutation',
  ])
  cache
    .getMutationCache()
    .build(cache, createContentOptions(undefined, 'first'))
  cache
    .getMutationCache()
    .build(cache, patchContentOptions(undefined, 'second'))
  await clearAdminDataQueries(cache)
  expect(cache.getMutationCache().getAll()).toHaveLength(1)
  cache.clear()
})
