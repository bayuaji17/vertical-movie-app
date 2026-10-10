import type { ContentType } from './content-client'
import { seasonsHref } from './series-form-state'

export type NextStep = {
  kind: 'setup' | 'seasons' | 'view'
  label: string
  // Short state shown beside the title.
  hint: string
  primary: boolean
}
type Item = {
  type: ContentType
  publicationStatus: string
  archivedAt: string | null
}
export const isOpenDraft = (item: Item) =>
  !item.archivedAt && item.publicationStatus === 'draft'

// The list only knows the editorial state, so Film/Standalone drafts resume the
// stepper (which opens at Media or Review as appropriate) and Series drafts go
// to their seasons. Per-item media progress would need an API field.
export function nextStep(item: Item): NextStep {
  if (item.archivedAt)
    return { kind: 'view', label: 'View', hint: 'Archived', primary: false }
  if (item.publicationStatus === 'published')
    return { kind: 'view', label: 'View', hint: 'Live', primary: false }
  if (item.type === 'series')
    return {
      kind: 'seasons',
      label: 'Manage episodes',
      hint: 'Draft · Add seasons and episodes',
      primary: true,
    }
  return {
    kind: 'setup',
    label: 'Continue setup',
    hint: 'Draft · Add media and publish',
    primary: true,
  }
}
export function nextStepHref(
  item: Item & { id: string; type: ContentType },
  step = nextStep(item),
) {
  const base = `/admin/content/${item.type}/${item.id}`
  if (step.kind === 'setup') return `${base}/setup`
  if (step.kind === 'seasons') return seasonsHref(item.id)
  return base
}
