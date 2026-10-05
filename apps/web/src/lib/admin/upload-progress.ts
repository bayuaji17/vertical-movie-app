import type { UploadStatus } from './media-client'
import { MediaApiError } from './media-errors'

export function uploadGeometry(status: UploadStatus, fileSize: number) {
  const size = Number(status.sizeBytes),
    partSize = Number(status.partSizeBytes)
  if (
    !Number.isSafeInteger(size) ||
    size !== fileSize ||
    size < 1 ||
    size > 1_500_000_000 ||
    !Number.isSafeInteger(partSize) ||
    partSize < 5242880 ||
    status.partCount !== Math.ceil(size / partSize) ||
    status.partCount < 1 ||
    status.partCount > 10000 ||
    !Number.isInteger(status.partConcurrency) ||
    status.partConcurrency < 1 ||
    !Number.isFinite(Date.parse(status.expiresAt))
  )
    throw new MediaApiError(
      0,
      'INVALID_RESPONSE',
      'Upload geometry is unavailable.',
    )
  return {
    size,
    partSize,
    count: status.partCount,
    concurrency: Math.min(status.partConcurrency, 3),
    length: (n: number) => Math.min(partSize, size - (n - 1) * partSize),
  }
}
export type UploadProgress = { sent: number; verified: number; total: number }
export function storedParts(
  status: UploadStatus,
  geometry: ReturnType<typeof uploadGeometry>,
) {
  const result = new Map<number, number>()
  for (const part of status.parts) {
    if (
      !Number.isInteger(part.partNumber) ||
      part.partNumber < 1 ||
      part.partNumber > geometry.count ||
      Number(part.sizeBytes) !== geometry.length(part.partNumber) ||
      !part.etag ||
      result.has(part.partNumber)
    )
      throw new MediaApiError(
        0,
        'INVALID_RESPONSE',
        'Stored parts could not be confirmed.',
      )
    result.set(part.partNumber, Number(part.sizeBytes))
  }
  return result
}
export function aggregateProgress(
  total: number,
  verified: Map<number, number>,
  active: Map<number, number>,
): UploadProgress {
  const stored = Array.from(verified.values()).reduce(
    (sum, bytes) => sum + bytes,
    0,
  )
  const sent = Array.from(active).reduce(
    (sum, [n, bytes]) => sum + (verified.has(n) ? 0 : bytes),
    stored,
  )
  return { sent: Math.min(total, sent), verified: stored, total }
}
