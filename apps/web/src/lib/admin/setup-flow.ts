import type { ContentDetail, ContentType } from './content-client'
import { isEditableContent } from './content-form-state'
import type { OwnerMedia } from './media-client'
import { mediaState } from './media-state'

export type SetupType = Exclude<ContentType, 'series'>
export type SetupStep = 'media' | 'review'
export type SetupStepId = 'details' | SetupStep
export type StepState = 'done' | 'current' | 'todo'

export const setupTypes = ['film', 'standalone'] as const
export const isSetupType = (value: unknown): value is SetupType =>
  setupTypes.some((type) => type === value)
export const parseSetupStep = (value: unknown): SetupStep | undefined =>
  value === 'media' || value === 'review' ? value : undefined
export const setupSearch = (search: Record<string, unknown>) => ({
  step: parseSetupStep(search.step),
})
export const setupHref = (type: SetupType, id: string, step?: SetupStep) =>
  `/admin/content/${type}/${id}/setup${step ? `?step=${step}` : ''}`

// The stepper only guides active Film/Standalone drafts; everything else keeps
// using the content detail page.
export function canUseSetup(detail: ContentDetail) {
  return (
    detail.type !== 'series' &&
    detail.data.kind !== 'episode' &&
    isEditableContent(detail)
  )
}
export const mediaReady = (media?: OwnerMedia) =>
  !!media?.source &&
  mediaState(media.source, 'source').ready &&
  mediaState(media.poster, 'poster').ready
// Resume where the draft is: Review once both files are ready, else Media.
export function initialSetupStep(media?: OwnerMedia): SetupStep {
  return mediaReady(media) ? 'review' : 'media'
}
// Review stays reachable only while both files are ready.
export const canOpenReview = mediaReady

export function setupSteps(current: SetupStep, media?: OwnerMedia) {
  const reviewOpen = canOpenReview(media)
  const steps: Array<{
    id: SetupStepId
    label: string
    state: StepState
    enabled: boolean
  }> = [
    { id: 'details', label: 'Details', state: 'done', enabled: true },
    {
      id: 'media',
      label: 'Media',
      state: current === 'media' ? 'current' : 'done',
      enabled: true,
    },
    {
      id: 'review',
      label: 'Review & publish',
      state: current === 'review' ? 'current' : 'todo',
      enabled: reviewOpen || current === 'review',
    },
  ]
  return steps
}

type ReadinessLike = {
  canPublish: boolean
  checks: ReadonlyArray<{ code: string; status: string }>
}
// The review step confirms rights itself, so an unconfirmed RIGHTS check alone
// must not block Publish; every other check still has to pass.
export function reviewReady(
  readiness: ReadinessLike | undefined,
  rightsConfirmed: boolean,
) {
  if (!readiness) return false
  if (readiness.canPublish) return true
  if (rightsConfirmed) return false
  return readiness.checks
    .filter(
      (check) => check.status !== 'not-applicable' && check.code !== 'RIGHTS',
    )
    .every((check) => check.status === 'passed')
}
