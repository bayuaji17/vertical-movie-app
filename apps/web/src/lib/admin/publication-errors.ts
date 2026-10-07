import { PrivateApiError } from '../api/private-result'

export class PublicationApiError extends PrivateApiError {}
const messages: Record<string, string> = {
  CONTENT_VERSION_CONFLICT:
    'Content has changed. Refresh status and review again.',
  PUBLICATION_STATE_CONFLICT:
    'Publication state has changed. Check status before continuing.',
  PUBLICATION_NOT_READY:
    'This video is not ready to publish. Refresh the checklist.',
  PUBLICATION_MEDIA_BUSY:
    'Finish or cancel the active upload before publishing.',
  PUBLICATION_IDEMPOTENCY_CONFLICT:
    'This request conflicts with another operation. Check status and review again.',
  CONTENT_NOT_FOUND: 'This content is no longer available.',
  VALIDATION_ERROR:
    'This request is not supported. Refresh status and review again.',
  AUTH_REQUIRED: 'Your admin session has ended. Sign in again.',
  ADMIN_FORBIDDEN: 'Admin access could not be confirmed.',
  AUTH_DEPENDENCY_UNAVAILABLE: 'Admin access is temporarily unavailable.',
  OFFLINE: 'You are offline. Reconnect, then check status before continuing.',
  LOCAL_UPLOAD_BUSY: 'Finish or pause the current upload before continuing.',
  STALE_PUBLICATION:
    'Content or media has changed. Refresh status and review again.',
  CONFIG_UNAVAILABLE: 'Publication configuration is unavailable.',
}
export function publicationFailure(error: unknown) {
  const code =
    error instanceof PublicationApiError
      ? error.code
      : 'PUBLICATION_REQUEST_FAILED'
  return {
    code,
    unknown:
      !(error instanceof PublicationApiError) ||
      (error.status === 0 &&
        ![
          'OFFLINE',
          'LOCAL_UPLOAD_BUSY',
          'STALE_PUBLICATION',
          'CONFIG_UNAVAILABLE',
        ].includes(code)) ||
      (error instanceof PublicationApiError && error.status >= 500),
    message:
      messages[code] ??
      'The result could not be confirmed. Check status before retrying.',
  }
}
