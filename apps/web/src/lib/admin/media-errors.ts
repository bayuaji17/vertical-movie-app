import { PrivateApiError } from '../api/private-result'

export class MediaApiError extends PrivateApiError {}
const messages: Record<string, string> = {
  NETWORK_ERROR:
    'The request could not be confirmed. Check upload status before retrying.',
  CONFIG_UNAVAILABLE:
    'Media configuration is unavailable. Contact the operator.',
  INVALID_RESPONSE:
    'The media response could not be confirmed. Check status before continuing.',
  UNAUTHORIZED: 'Your admin session has ended. Sign in again.',
  FORBIDDEN: 'Admin access could not be confirmed.',
  CONTENT_NOT_FOUND: 'This content or upload is no longer available.',
  CONTENT_STATE_CONFLICT: 'Uploads are available only for active drafts.',
  UPLOAD_ALREADY_ACTIVE:
    'An upload already exists. Check its status before starting another.',
  UPLOAD_STATE_CONFLICT: 'The upload is busy or has changed. Check its status.',
  UPLOAD_IDEMPOTENCY_CONFLICT:
    'This request belongs to another file. Check the existing upload.',
  UPLOAD_EXPIRED: 'This upload has expired. Cancel it and start a new upload.',
  STORAGE_PROFILE_CONFLICT:
    'The storage profile has changed. Contact the operator.',
  STORAGE_UNAVAILABLE:
    'Storage is temporarily unavailable. Check status and try again.',
  CONTENT_DEPENDENCY_UNAVAILABLE:
    'The media service is temporarily unavailable.',
  VALIDATION_ERROR: 'This file or upload request is not supported.',
  MEDIA_SOURCE_CHANGED:
    'File verification failed. Select the correct file and start a new upload.',
  FILE_MISMATCH:
    'Select the same file to resume. Its contents must match the original file.',
  LEGACY_UPLOAD:
    'This upload has no file fingerprint. Cancel it and start a new upload.',
  ANOTHER_TAB:
    'Another tab is managing this upload. Pause it there before continuing.',
}
export function mediaFailure(error: unknown) {
  const code =
    error instanceof MediaApiError && error.code in messages
      ? error.code
      : 'MEDIA_REQUEST_FAILED'
  return {
    code,
    message:
      messages[code] ??
      'The media request could not be confirmed. Check status and try again.',
  }
}
export function mediaRequestError(
  status: number,
  code: string,
  message: string,
) {
  return new MediaApiError(
    status,
    code in messages ? code : 'MEDIA_REQUEST_FAILED',
    message,
  )
}
