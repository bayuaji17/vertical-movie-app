import type { UploadDescriptor, UploadStatus } from './media-client'
import type { UploadProgress } from './upload-progress'

export type UploadPhase =
  | 'idle'
  | 'selected'
  | 'queued'
  | 'checking'
  | 'starting'
  | 'uploading'
  | 'paused'
  | 'needs-file'
  | 'finalizing'
  | 'completed'
  | 'cancelling'
  | 'unknown'
  | 'failed'
export type UploadView = {
  phase: UploadPhase
  filename?: string
  previewUrl?: string
  hashBytes: number
  progress: UploadProgress
  descriptor?: UploadDescriptor
  status?: UploadStatus
  error?: { code: string; message: string }
}
export function emptyUpload(): UploadView {
  return {
    phase: 'idle',
    hashBytes: 0,
    progress: { sent: 0, verified: 0, total: 0 },
  }
}
export function isUploadWorking(view: UploadView) {
  return [
    'queued',
    'checking',
    'starting',
    'uploading',
    'finalizing',
    'cancelling',
  ].includes(view.phase)
}
export function sessionPhase(status: UploadStatus): UploadPhase {
  if (status.status === 'completed') return 'completed'
  if (status.status === 'pending') return 'needs-file'
  if (
    status.status === 'aborted' ||
    status.status === 'expired' ||
    status.status === 'failed'
  )
    return 'failed'
  return 'unknown'
}
