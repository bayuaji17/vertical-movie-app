import { PrivateApiError } from '../api/private-result'

export class MediaApiError extends PrivateApiError {}
const messages: Record<string, string> = {
  OFFLINE: 'You are offline. Reconnect, then resume the upload.',
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
  COVER_CROP_MISMATCH:
    'This crop does not match the uploaded cover. Cancel this upload, then choose and crop the image again.',
  FILE_EMPTY: 'Choose a file that is not empty.',
  FILE_NAME_INVALID: 'Choose a file with a valid filename.',
  FILE_TOO_LARGE: 'Choose a file within the size limit shown below.',
  FILE_UNSUPPORTED: 'Choose a supported format with a matching media type.',
  FILE_READ_ERROR: 'The file could not be read. Select it again.',
  FILE_CHECK_UNAVAILABLE:
    'This browser cannot check the file. Use a browser with Web Worker support.',
  LEGACY_UPLOAD:
    'This upload has no file fingerprint. Cancel it and start a new upload.',
  ANOTHER_TAB:
    'Another tab is managing this upload. Pause it there before continuing.',
  POSTER_ANIMATED_IMAGE:
    'Animated covers are not supported. Choose a static PNG or WebP and crop it again.',
  POSTER_HASH_MISMATCH:
    'Cover integrity verification failed. Cancel this upload and crop the image again.',
  POSTER_INVALID_DIMENSIONS:
    'The uploaded crop is not 9:16. Crop the image again and try once more.',
  POSTER_SOURCE_TOO_SMALL:
    'This image is too small for a 1080 × 1920 cover. Choose a larger image and crop it again.',
  POSTER_INVALID_IMAGE:
    'The cover could not be decoded. Choose a different static PNG or WebP and crop it again.',
  POSTER_INVALID_TYPE:
    'Only static PNG and WebP covers are supported. Choose another image and crop it again.',
  POSTER_PIXEL_LIMIT:
    'This image exceeds the supported dimensions. Choose a smaller image and crop it again.',
  POSTER_SOURCE_TOO_LARGE:
    'The cropped cover exceeds the 5 MB limit. Use a smaller source image or adjust the crop.',
  POSTER_INVALID_OUTPUT:
    'The processed cover could not be verified. Check status, then try a new crop if needed.',
  POSTER_PROCESSING_BUSY:
    'Cover processing is already running. Check status shortly.',
  POSTER_PROCESSING_RETRY:
    'Cover processing is waiting for a retry. Check status shortly, then use Finish cover when available.',
  POSTER_PROCESSING_EXHAUSTED:
    'Cover processing reached its retry limit. Choose and crop a new cover image.',
  POSTER_PROCESSING_STALE:
    'This processing attempt is no longer current. Refresh media status before continuing.',
  POSTER_PROCESSING_UNAVAILABLE:
    'This cover cannot be prepared in its current state. Refresh media status.',
  POSTER_UPLOAD_INCOMPLETE:
    'The cover upload is not complete yet. Finish the upload before preparing it.',
  POSTER_ASSET_CHANGED:
    'The attached cover changed. Refresh media status before continuing.',
  POSTER_OUTPUT_INVALID:
    'The saved cover output failed verification. Choose and upload a new crop.',
  POSTER_TIMEOUT:
    'Cover processing timed out. Check status, then use Finish cover if it is available.',
  POSTER_ABORTED:
    'Cover processing was interrupted. Check status before continuing.',
  POSTER_BUSY:
    'Cover processing is busy. Check status and try Finish cover again shortly.',
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
