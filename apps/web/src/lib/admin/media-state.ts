import type { OwnerMedia, RoleInventory, UploadStatus } from './media-client'

const workingJobs = new Set(['queued', 'running', 'retry'])
export function roleNeedsPolling(role: RoleInventory | null): boolean {
  if (!role) return false
  if (role.busy || role.active) return true
  const current = role.current
  if (!current) return false
  if (
    current.state === 'failed' ||
    (current.state === 'ready' && current.verifiedReadyAt)
  )
    return false
  return (
    ['uploading', 'uploaded', 'processing'].includes(current.state) ||
    workingJobs.has(current.processing.jobState ?? '')
  )
}
export function inventoryNeedsPolling(inventory?: OwnerMedia) {
  return (
    !!inventory &&
    (roleNeedsPolling(inventory.source) || roleNeedsPolling(inventory.poster))
  )
}
export function sessionNeedsPolling(status?: UploadStatus) {
  return (
    !!status &&
    (!['completed', 'aborted', 'expired', 'failed'].includes(status.status) ||
      (status.status === 'completed' &&
        (['uploaded', 'processing'].includes(status.processing.state) ||
          workingJobs.has(status.processing.jobState ?? ''))))
  )
}
export function mediaState(
  role: RoleInventory,
  kind: 'source' | 'poster' = 'source',
) {
  const current = role.current,
    requestPoster =
      kind === 'poster' &&
      (role.canProcessPoster ||
        role.active?.processingMode === 'request' ||
        role.lastAttempt?.processingMode === 'request')
  if (!current)
    return {
      label: kind === 'poster' ? 'No attached cover' : 'No attached media',
      ready: false,
      pending: false,
    }
  if (current.state === 'ready' && current.verifiedReadyAt)
    return { label: 'Ready', ready: true, pending: false }
  if (current.state === 'failed')
    return {
      label:
        kind === 'poster' ? 'Cover processing failed' : 'Processing failed',
      ready: false,
      pending: false,
    }
  if (
    requestPoster &&
    (['uploaded', 'processing'].includes(current.state) ||
      workingJobs.has(current.processing.jobState ?? ''))
  )
    return { label: 'Preparing cover', ready: false, pending: true }
  if (current.processing.jobState === 'queued')
    return {
      label: 'Upload completed · Waiting for processing',
      ready: false,
      pending: true,
    }
  if (current.processing.jobState === 'retry')
    return {
      label: requestPoster ? 'Preparing cover' : 'Processing retry scheduled',
      ready: false,
      pending: true,
    }
  if (
    current.state === 'processing' ||
    current.processing.jobState === 'running'
  )
    return {
      label: requestPoster ? 'Preparing cover' : 'Processing',
      ready: false,
      pending: true,
    }
  if (current.state === 'uploaded')
    return {
      label: requestPoster
        ? 'Preparing cover'
        : 'Upload completed · Verification pending',
      ready: false,
      pending: true,
    }
  if (current.state === 'uploading')
    return { label: 'Uploading', ready: false, pending: true }
  return {
    label: requestPoster
      ? 'Cover status unavailable · Refresh media'
      : 'Status unavailable · Refresh media',
    ready: false,
    pending: false,
  }
}
