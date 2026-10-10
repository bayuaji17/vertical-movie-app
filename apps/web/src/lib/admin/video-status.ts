import type { RoleInventory } from './media-client'
import { mediaState } from './media-state'
import type { UploadView } from './upload-state'

export type VideoStage =
  | 'empty'
  | 'checking'
  | 'uploading'
  | 'finishing'
  | 'paused'
  | 'needs-file'
  | 'cancelling'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'unknown'
export type VideoStepId = 'upload' | 'processing' | 'ready'
export type VideoStep = {
  id: VideoStepId
  label: string
  state: 'done' | 'current' | 'todo'
}
export type VideoStatus = {
  stage: VideoStage
  title: string
  detail?: string
  // 0–100 while checking or uploading; undefined otherwise.
  percent?: number
  steps: VideoStep[]
}

const titles: Record<VideoStage, string> = {
  empty: 'Choose your video',
  checking: 'Checking your file',
  uploading: 'Uploading',
  finishing: 'Finishing upload',
  paused: 'Upload paused',
  'needs-file': 'Select the same file to continue',
  cancelling: 'Cancelling upload',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Something went wrong',
  unknown: 'Status could not be confirmed',
}
const percentOf = (value: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(100, Math.floor((value / total) * 100))) : 0

// Collapse the manager's fifteen phases plus the server inventory into the
// single Uploading → Processing → Ready story shown to the admin.
export function videoStage(view: UploadView, role: RoleInventory): VideoStage {
  const current = role.current
  const state = current ? mediaState(role, 'source') : undefined
  switch (view.phase) {
    case 'cancelling':
      return 'cancelling'
    case 'checking':
    case 'selected':
      return 'checking'
    case 'queued':
    case 'starting':
    case 'uploading':
      return 'uploading'
    case 'finalizing':
      return 'finishing'
    case 'paused':
      return 'paused'
    case 'needs-file':
      return 'needs-file'
    case 'unknown':
      return 'unknown'
    case 'failed':
      return 'failed'
  }
  if (current?.state === 'failed') return 'failed'
  if (state?.ready) return 'ready'
  if (view.phase === 'completed' || state?.pending) return 'processing'
  if (role.active?.status === 'pending') return 'needs-file'
  return 'empty'
}
export function videoStatus(
  view: UploadView,
  role: RoleInventory,
): VideoStatus {
  const stage = videoStage(view, role)
  const uploadDone = stage === 'processing' || stage === 'ready'
  const uploadActive = [
    'checking',
    'uploading',
    'finishing',
    'paused',
    'needs-file',
    'cancelling',
    'unknown',
  ].includes(stage)
  const steps: VideoStep[] = [
    {
      id: 'upload',
      label: 'Uploading',
      state: uploadDone ? 'done' : uploadActive ? 'current' : 'todo',
    },
    {
      id: 'processing',
      label: 'Processing',
      state:
        stage === 'ready'
          ? 'done'
          : stage === 'processing'
            ? 'current'
            : 'todo',
    },
    { id: 'ready', label: 'Ready', state: stage === 'ready' ? 'done' : 'todo' },
  ]
  const percent =
    stage === 'checking'
      ? percentOf(view.hashBytes, view.progress.total)
      : stage === 'uploading' || stage === 'finishing'
        ? percentOf(view.progress.sent, view.progress.total)
        : undefined
  return {
    stage,
    title: titles[stage],
    detail: stage === 'failed' ? view.error?.message : undefined,
    percent,
    steps,
  }
}
export function formatBytes(size: number) {
  if (size < 1000) return `${size} B`
  const divisor = size < 1000000 ? 1000 : 1000000
  return `${(size / divisor).toLocaleString('en-US', { maximumFractionDigits: 1 })} ${divisor === 1000 ? 'KB' : 'MB'}`
}
export const VIDEO_STEP_HINT: Record<
  VideoStepId,
  Record<'done' | 'current' | 'todo', string>
> = {
  upload: {
    done: 'Done',
    current: 'In progress',
    todo: 'Starts when you pick a file',
  },
  processing: {
    done: 'Done',
    current: 'In progress',
    todo: 'Starts automatically',
  },
  ready: {
    done: 'You can preview it',
    current: '',
    todo: 'You can preview it',
  },
}
