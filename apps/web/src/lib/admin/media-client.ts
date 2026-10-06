import type { QueryClient } from '@tanstack/react-query'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import type { ApiFetcher } from '../api/client'
import { unwrapPrivateResult } from '../api/private-result'
import { isUuid } from './content-identifiers'
import { MediaApiError, mediaRequestError } from './media-errors'

type Eden = ReturnType<typeof createPrivateApiClient>
export type MediaInitiate = Parameters<
  Eden['admin']['media']['uploads']['post']
>[0]
export type MediaOwner = Pick<MediaInitiate, 'ownerType' | 'ownerId'>
export type MediaKind = MediaInitiate['kind']
const unwrap = <T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
) =>
  unwrapPrivateResult(request, {
    fallbackCode: 'MEDIA_REQUEST_FAILED',
    failureMessage: 'Media request failed.',
    networkMessage:
      'The request could not be confirmed. Check upload status before retrying.',
    error: mediaRequestError,
  })
function invalidResponse(): never {
  throw new MediaApiError(
    0,
    'INVALID_RESPONSE',
    'The media response could not be confirmed.',
  )
}
function validSize(value: unknown) {
  return (
    typeof value === 'string' &&
    /^[1-9][0-9]*$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) <= 1_500_000_000
  )
}
function validLimits(value: unknown) {
  return (
    !!value &&
    typeof value === 'object' &&
    'maxBytes' in value &&
    validSize(value.maxBytes)
  )
}
export function createMediaClient(
  baseUrl: string,
  cache: QueryClient,
  fetcher?: ApiFetcher,
) {
  const api = createPrivateApiClient(baseUrl, cache, fetcher)
  const uploads = api.admin.media.uploads
  return {
    async owner(owner: MediaOwner, signal?: AbortSignal) {
      const result = await unwrap(
        api.admin.media
          .owners({ ownerType: owner.ownerType })({ ownerId: owner.ownerId })
          .get({ fetch: { signal } }),
      )
      const config: unknown = result.config
      if (
        result.ownerId !== owner.ownerId ||
        result.ownerType !== owner.ownerType ||
        !Number.isSafeInteger(result.rowVersion) ||
        result.rowVersion < 1 ||
        typeof result.canUpload !== 'boolean' ||
        typeof result.canPreview !== 'boolean' ||
        !config ||
        typeof config !== 'object' ||
        !('source' in config) ||
        !('poster' in config) ||
        !validLimits(config.source) ||
        !validLimits(config.poster)
      )
        invalidResponse()
      return result
    },
    async initiate(input: MediaInitiate, signal?: AbortSignal) {
      const result = await unwrap(uploads.post(input, { fetch: { signal } }))
      if (
        !isUuid(result.id) ||
        !isUuid(result.assetId) ||
        result.sizeBytes !== input.sizeBytes
      )
        invalidResponse()
      return result
    },
    async status(id: string, signal?: AbortSignal) {
      const result = await unwrap(uploads({ id }).get({ fetch: { signal } }))
      if (
        result.id !== id ||
        !isUuid(result.assetId) ||
        !validSize(result.sizeBytes)
      )
        invalidResponse()
      return result
    },
    async signPart(id: string, partNumber: number, signal?: AbortSignal) {
      // Signed URLs bypass Query/mutation caches and are held only by the transport attempt.
      const result = await unwrap(
        uploads({ id }).parts.post({ partNumber }, { fetch: { signal } }),
      )
      if (
        result.partNumber !== partNumber ||
        !Number.isFinite(Date.parse(result.expiresAt)) ||
        (result.alreadyUploaded ? result.url !== null : !result.url)
      )
        invalidResponse()
      if (result.url) {
        let url: URL
        try {
          url = new URL(result.url)
        } catch {
          invalidResponse()
        }
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.hash
        )
          invalidResponse()
      }
      return result
    },
    async complete(id: string, signal?: AbortSignal) {
      const result = await unwrap(
        uploads({ id }).complete.post(undefined, { fetch: { signal } }),
      )
      if (result.id !== id || result.status !== 'completed') invalidResponse()
      return result
    },
    async processPoster(id: string, signal?: AbortSignal) {
      const result = await unwrap(
        uploads({ id })['process-poster'].post({}, { fetch: { signal } }),
      )
      if (result.id !== id || result.status !== 'completed') invalidResponse()
      return result
    },
    async abort(id: string, signal?: AbortSignal) {
      const result = await unwrap(
        uploads({ id }).abort.post(undefined, { fetch: { signal } }),
      )
      if (result.id !== id || !['aborted', 'expired'].includes(result.status))
        invalidResponse()
      return result
    },
  }
}
export type MediaClient = ReturnType<typeof createMediaClient>
export type OwnerMedia = Awaited<ReturnType<MediaClient['owner']>>
export type UploadStatus = Awaited<ReturnType<MediaClient['status']>>
export type UploadDescriptor = NonNullable<OwnerMedia['poster']['active']>
export type RoleInventory = OwnerMedia['poster']
export function browserMediaClient(cache: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createMediaClient(base, cache) : undefined
}
