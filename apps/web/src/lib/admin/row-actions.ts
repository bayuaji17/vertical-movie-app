import type { ContentItem } from './content-client'
import { deleteBlock } from './delete-state'
import type { DeleteTarget } from './delete-state'
import { nextStep } from './next-step'
import type { NextStep } from './next-step'

export type RowActions = {
  primary: NextStep
  // Secondary links that live in the "⋯" menu; the primary button already
  // covers "View" for live and archived rows.
  details: boolean
  edit: boolean
  // Why Delete is unavailable, or undefined when it can be used.
  deleteBlock: string | undefined
  deleteTarget: DeleteTarget
}

export const deleteTargetFor = (item: ContentItem): DeleteTarget => ({
  kind: item.type === 'film' ? 'movie' : item.type,
  id: item.id,
  title: item.title,
  version: item.rowVersion,
  publicationStatus: item.publicationStatus,
  archivedAt: item.archivedAt,
})
/** One primary action per row; everything else is a menu item. */
export function rowActions(item: ContentItem): RowActions {
  const primary = nextStep(item)
  const target = deleteTargetFor(item)
  return {
    primary,
    details: primary.primary,
    edit: !item.archivedAt && item.publicationStatus === 'draft',
    deleteBlock: deleteBlock(target),
    deleteTarget: target,
  }
}
