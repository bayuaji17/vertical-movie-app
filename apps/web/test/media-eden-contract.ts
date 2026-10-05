import type { createApiClient } from '../src/lib/api/client'

/** Compile-only proof: media contracts cross the type-only API boundary without requests. */
export async function verifyMediaContract(
  client: ReturnType<typeof createApiClient>,
) {
  const id = '01900000-0000-7000-8000-000000000000'
  const inventory = await client.admin.media
    .owners({ ownerType: 'video' })({ ownerId: id })
    .get()
  if (inventory.data) {
    const version: number = inventory.data.rowVersion
    const preview: boolean = inventory.data.canPreview
    const maxBytes: string = inventory.data.config.source.maxBytes
    void [version, preview, maxBytes]
    // @ts-expect-error Inventory must never expose private object identities.
    void inventory.data.source?.current?.objectKey
    // @ts-expect-error Descriptors never expose provider multipart upload IDs.
    void inventory.data.source?.active?.uploadId
  }
  const upload = await client.admin.media.uploads.post({
    ownerType: 'video',
    ownerId: id,
    kind: 'source',
    filename: 'movie.mp4',
    contentType: 'video/mp4',
    sizeBytes: '100',
    idempotencyKey: id,
  })
  if (upload.data) {
    const size: string = upload.data.sizeBytes
    const progress: number = upload.data.processing.progressSeconds
    void [size, progress]
    await client.admin.media.uploads({ id: upload.data.id }).get()
    await client.admin.media
      .uploads({ id: upload.data.id })
      .parts.post({ partNumber: 1 })
    await client.admin.media.uploads({ id: upload.data.id }).complete.post()
    await client.admin.media.uploads({ id: upload.data.id }).abort.post()
  }
  await client.admin
    .videos({ id })
    .publish.post({ expectedVersion: 1, idempotencyKey: id })
  await client.admin
    .series({ id })
    .publish.post({ expectedVersion: 1, idempotencyKey: id })
  const preview = await client.admin.videos({ id }).playback.get()
  if (preview.data) {
    const expiresAt: string = preview.data.expiresAt
    const durationMs: number = preview.data.durationMs
    void [expiresAt, durationMs]
  }
  await client.admin.videos({ id }).hls['master.m3u8'].get()
  await client.admin.videos({ id }).hls.variants({ index: '0' }).get()
  const list = await client.videos.get({ query: { limit: '10' } })
  if (list.data?.items[0]) {
    const publicVideo = list.data.items[0]
    const slug: string = publicVideo.slug
    await client.videos({ slug }).get()
    await client.videos({ slug }).next.get()
    const playback = await client.videos({ slug }).playback.get()
    if (playback.data) {
      const masterUrl: string = playback.data.masterUrl
      void masterUrl
    }
    await client.playback.videos({ slug })['master.m3u8'].get()
    await client.playback.videos({ slug }).variants({ index: '0' }).get()
    // @ts-expect-error Public metadata must not expose private storage identity.
    void publicVideo.objectKey
  }
  await client.series.get()
  await client.series({ slug: 'example-series' }).get()
  await client.admin.media.uploads.post({
    ownerType: 'video',
    ownerId: id,
    kind: 'source',
    filename: 'movie.mp4',
    contentType: 'video/mp4',
    // @ts-expect-error Upload size is a decimal string across the JSON boundary.
    sizeBytes: 100,
    idempotencyKey: id,
  })
}
