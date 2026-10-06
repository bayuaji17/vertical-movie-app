import type { MediaKind, OwnerMedia, UploadDescriptor } from './media-client'
import { MediaApiError } from './media-errors'
import { hashFile } from './file-fingerprint'

export type SelectedFileDescriptor = {
  filename: string
  contentType: string
  sizeBytes: string
}

export const MAX_CROPPED_COVER_BYTES = 5_000_000

/** Build the upload File from the bytes and actual format returned by Canvas. */
export function createCroppedCoverFile(
  originalFilename: string,
  blob: Blob,
  maxBytes = MAX_CROPPED_COVER_BYTES,
) {
  const extension =
    blob.type === 'image/webp'
      ? 'webp'
      : blob.type === 'image/png'
        ? 'png'
        : undefined
  if (!extension)
    throw new MediaApiError(
      422,
      'FILE_UNSUPPORTED',
      'The cropped cover format is not supported.',
    )
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    blob.size < 1 ||
    blob.size > maxBytes
  )
    throw new MediaApiError(
      422,
      'FILE_TOO_LARGE',
      'The cropped cover is larger than the allowed file size.',
    )

  const basename = originalFilename.split(/[\\/]/).at(-1) || 'cover',
    dot = basename.lastIndexOf('.'),
    rawStem = dot > 0 ? basename.slice(0, dot) : basename,
    stem =
      Array.from(rawStem, (char) =>
        char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? '_' : char,
      )
        .slice(0, 250)
        .join('') || 'cover'
  return new File([blob], `${stem}.${extension}`, {
    type: blob.type,
    lastModified: Date.now(),
  })
}

function describeFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
  kind: MediaKind,
  inventory: OwnerMedia,
  enforceSizeLimit: boolean,
): SelectedFileDescriptor {
  if (kind === 'source' && inventory.ownerType === 'series')
    throw new MediaApiError(
      422,
      'VALIDATION_ERROR',
      'Series supports a cover only.',
    )
  if (
    !file.name ||
    file.name.length > 255 ||
    /[\\/]/.test(file.name) ||
    Array.from(file.name).some((char) => char.charCodeAt(0) < 32)
  )
    throw new MediaApiError(
      422,
      'FILE_NAME_INVALID',
      'Choose a file with a valid filename.',
    )
  if (!Number.isSafeInteger(file.size) || file.size <= 0)
    throw new MediaApiError(
      422,
      'FILE_EMPTY',
      'Choose a file that is not empty.',
    )
  const rules = inventory.config[kind]
  const max = Number(rules.maxBytes)
  if (!Number.isSafeInteger(max) || max < 1)
    throw new MediaApiError(
      0,
      'CONFIG_UNAVAILABLE',
      'Media limits are unavailable.',
    )
  if (enforceSizeLimit && file.size > max)
    throw new MediaApiError(
      422,
      'FILE_TOO_LARGE',
      'Choose a file within the displayed size limit.',
    )
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  const format = rules.formats.find((value) => value.extension === extension)
  if (!format)
    throw new MediaApiError(
      422,
      'FILE_UNSUPPORTED',
      'Choose one of the supported file formats.',
    )
  const contentType = file.type.toLowerCase() || format.contentTypes[0]
  if (!contentType || !format.contentTypes.includes(contentType))
    throw new MediaApiError(
      422,
      'FILE_UNSUPPORTED',
      'The filename and media type do not match.',
    )
  // MIME/extension are hints only. The server worker verifies codecs, dimensions and duration.
  return { filename: file.name, contentType, sizeBytes: String(file.size) }
}

export function describeMediaFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
  kind: MediaKind,
  inventory: OwnerMedia,
) {
  return describeFile(file, kind, inventory, true)
}

/** Validate the original cover before cropping; the configured byte limit applies to the output. */
export function describeCoverCropSource(
  file: Pick<File, 'name' | 'size' | 'type'>,
  inventory: OwnerMedia,
) {
  return describeFile(file, 'poster', inventory, false)
}
export async function verifyReselectedFile(
  file: File,
  descriptor: UploadDescriptor,
  options: Parameters<typeof hashFile>[1] = {},
  hash: typeof hashFile = hashFile,
) {
  if (!descriptor.expectedSha256)
    throw new MediaApiError(
      409,
      'LEGACY_UPLOAD',
      'Cancel and restart this legacy upload.',
    )
  if (Date.parse(descriptor.expiresAt) <= Date.now())
    throw new MediaApiError(409, 'UPLOAD_EXPIRED', 'This upload has expired.')
  if (!descriptor.canResume || descriptor.status !== 'pending')
    throw new MediaApiError(
      409,
      'UPLOAD_STATE_CONFLICT',
      'Check upload status before resuming.',
    )
  if (
    file.name !== descriptor.filename ||
    String(file.size) !== descriptor.sizeBytes ||
    (file.type && file.type.toLowerCase() !== descriptor.contentType)
  )
    throw new MediaApiError(
      422,
      'FILE_MISMATCH',
      'Select the same file to resume.',
    )
  const digest = await hash(file, options)
  if (digest !== descriptor.expectedSha256)
    throw new MediaApiError(
      422,
      'FILE_MISMATCH',
      'Select the same file to resume.',
    )
  return digest
}
