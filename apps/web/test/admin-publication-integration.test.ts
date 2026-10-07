import { expect, test, spyOn } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  previewContext,
  previewDetailHref,
} from '../src/lib/admin/preview-navigation'
import {
  hasWorkingUploads,
  registerUploadManager,
} from '../src/lib/admin/upload-session-registry'
import {
  UploadManager,
  UploadCoordinator,
} from '../src/lib/admin/upload-manager'
import { createMediaClient } from '../src/lib/admin/media-client'
import {
  publicationKeys,
  scopePublicationRead,
} from '../src/lib/admin/publication-queries'
import { inventoryFixture, mediaOwnerId } from './admin-media-fixture'

const id = mediaOwnerId,
  other = '00000000-0000-4000-8000-000000000002'
test('same-owner work locks publication without globally locking another owner', () => {
  const cache = new QueryClient(),
    client = createMediaClient('http://localhost', cache, async () =>
      Response.json({}),
    )
  const manager = new UploadManager({
    client,
    coordinator: new UploadCoordinator(),
    changed: () => {},
    committed: async () => {},
  })
  manager.observe(inventoryFixture())
  const spy = spyOn(manager, 'working').mockReturnValue(true)
  const unregister = registerUploadManager(cache, manager)
  expect(hasWorkingUploads(cache)).toBe(true)
  expect(hasWorkingUploads(cache, { ownerType: 'video', ownerId: id })).toBe(
    true,
  )
  expect(hasWorkingUploads(cache, { ownerType: 'video', ownerId: other })).toBe(
    false,
  )
  expect(hasWorkingUploads(cache, { ownerType: 'series', ownerId: id })).toBe(
    false,
  )
  spy.mockRestore()
  unregister()
  manager.dispose()
  cache.clear()
})
test('late read ignoring cancellation never becomes cached private data', async () => {
  const cache = new QueryClient(),
    owner = new AbortController()
  let release!: (value: unknown) => void
  const pending = new Promise((r) => {
    release = r
  })
  const read = cache.fetchQuery({
    queryKey: publicationKeys.video('old', id),
    retry: false,
    queryFn: ({ signal }) =>
      scopePublicationRead(owner.signal, signal, async () => pending),
  })
  owner.abort()
  release({ secret: 'must not be cached' })
  await expect(read).rejects.toMatchObject({ name: 'AbortError' })
  expect(cache.getQueryData(publicationKeys.video('old', id))).toBeUndefined()
  cache.clear()
})
test('preview return context accepts only known type and UUID, never arbitrary return URLs', () => {
  expect(
    previewContext({ type: 'film', returnTo: 'https://external.test' }),
  ).toEqual({ type: 'film' })
  expect(previewContext({ type: 'standalone' })).toEqual({ type: 'standalone' })
  expect(previewContext({ type: 'series' })).toEqual({})
  expect(previewContext({ type: '../../redirect' })).toEqual({})
  expect(previewDetailHref(id, 'film')).toBe(`/admin/content/film/${id}`)
  expect(previewDetailHref('bad', 'film')).toBeUndefined()
  expect(previewDetailHref(id)).toBeUndefined()
})
