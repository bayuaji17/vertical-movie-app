import { ContentApiError } from './content-client'

export function contentErrorMessage(error: unknown, mutation = false) {
  if (!(error instanceof ContentApiError))
    return mutation
      ? 'The save could not be confirmed. Check the content list before submitting again.'
      : 'Content could not be loaded. Try again.'
  switch (error.code) {
    case 'SEASON_NUMBER_CONFLICT':
      return 'This season number is already reserved. Choose another number.'
    case 'EPISODE_NUMBER_CONFLICT':
      return 'This episode number is already reserved in the selected season. Choose another number.'
    case 'CONTENT_ARCHIVED':
      return 'This record or its parent has been archived. Your input is preserved; reload its current state.'
    case 'SLUG_CONFLICT':
      return 'This slug is already in use. Choose another slug.'
    case 'CONTENT_VERSION_CONFLICT':
      return 'This content changed in another session. Your input is preserved. Reload the latest version before saving.'
    case 'CONTENT_STATE_CONFLICT':
      return 'This content can no longer be edited in this workflow. Reload its current state.'
    case 'CONFIG_UNAVAILABLE':
      return 'API configuration is unavailable. Contact the operator.'
  }
  if (error.status === 401) return 'Your session has ended. Sign in again.'
  if (error.status === 403)
    return 'You do not have permission to access this content.'
  if (error.status === 404) return 'Content not found.'
  if (mutation && (error.status === 0 || error.status >= 500))
    return 'The save could not be confirmed. Your input is preserved. Check the content list before submitting again.'
  if (error.status === 422)
    return 'The server could not accept these values. Review your metadata.'
  return mutation
    ? 'Content could not be saved. Your input is preserved.'
    : 'Content could not be loaded. Try again.'
}
