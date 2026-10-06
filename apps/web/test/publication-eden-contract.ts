import type { createApiClient } from '../src/lib/api/client'

export async function publicationContract(
  client: ReturnType<typeof createApiClient>,
  id: string,
) {
  const video = client.admin.videos({ id })
  const read = await video['publication-readiness'].get()
  if (read.data) {
    const code:
      | 'ACTIVE_DRAFT'
      | 'TITLE'
      | 'SYNOPSIS'
      | 'RIGHTS'
      | 'VERIFIED_MEDIA'
      | 'NO_ACTIVE_UPLOAD'
      | 'ACTIVE_PARENTS' = read.data.checks[0].code
    void code
  }
  await video.publish.post({ expectedVersion: 1, idempotencyKey: id })
  await video.archive.post({ expectedVersion: 2 })
  // @ts-expect-error A publication key is mandatory.
  await video.publish.post({ expectedVersion: 1 })
  // @ts-expect-error Archive has no idempotency field.
  await video.archive.post({ expectedVersion: 1, idempotencyKey: id })
  // @ts-expect-error Expected version is numeric.
  await video.publish.post({ expectedVersion: '1', idempotencyKey: id })
}
