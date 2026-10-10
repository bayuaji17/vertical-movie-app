import type { ContentDetail } from './content-client'
import { contentErrorMessage } from './content-errors'

export type RightsOutcome =
  { status: 'confirmed' } | { status: 'failed'; message: string }

const confirmedAt = (detail: ContentDetail) =>
  detail.type !== 'series' && !!detail.data.rightsConfirmedAt

// Rights live in the metadata, while Publish is a separate command. The stepper
// saves the confirmation first (PATCH with the version it read) and publishes
// only afterwards. A lost or conflicting response is settled by re-reading the
// draft: if the confirmation is there, nothing is sent again.
export async function ensureRights(options: {
  detail: ContentDetail
  patch: (input: {
    rightsConfirmed: true
    expectedVersion: number
  }) => Promise<unknown>
  reload: () => Promise<ContentDetail>
}): Promise<RightsOutcome> {
  if (confirmedAt(options.detail)) return { status: 'confirmed' }
  try {
    await options.patch({
      rightsConfirmed: true,
      expectedVersion: options.detail.data.rowVersion,
    })
    return { status: 'confirmed' }
  } catch (error) {
    try {
      if (confirmedAt(await options.reload())) return { status: 'confirmed' }
    } catch {
      // Fall through: the outcome could not be confirmed either way.
    }
    return { status: 'failed', message: contentErrorMessage(error, true) }
  }
}
