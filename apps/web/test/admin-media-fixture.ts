import type {
  OwnerMedia,
  UploadStatus,
  UploadDescriptor,
} from '../src/lib/admin/media-client'

export const mediaOwnerId = '00000000-0000-4000-8000-000000000001'
export const mediaUploadId = '00000000-0000-4000-8000-000000000002'
export const mediaAssetId = '00000000-0000-4000-8000-000000000003'
export function inventoryFixture(): OwnerMedia {
  const empty = () => ({
    current: null,
    active: null,
    lastAttempt: null,
    busy: false,
  })
  return {
    ownerType: 'video',
    ownerId: mediaOwnerId,
    rowVersion: 1,
    status: 'draft',
    canUpload: true,
    canPreview: false,
    source: empty(),
    poster: empty(),
    config: {
      partConcurrency: 3,
      sessionTtlSeconds: 86400,
      partUrlTtlSeconds: 900,
      maxDurationSeconds: 1800,
      minVideoWidth: 480,
      maxVideoWidth: 1080,
      minPosterWidth: 1080,
      minPosterHeight: 1920,
      source: {
        maxBytes: '1500000000',
        formats: [
          { extension: 'mp4', contentTypes: ['video/mp4'] },
          { extension: 'mov', contentTypes: ['video/quicktime'] },
          { extension: 'mkv', contentTypes: ['video/x-matroska'] },
          { extension: 'webm', contentTypes: ['video/webm'] },
        ],
      },
      poster: {
        maxBytes: '5000000',
        formats: [
          { extension: 'jpg', contentTypes: ['image/jpeg'] },
          { extension: 'jpeg', contentTypes: ['image/jpeg'] },
          { extension: 'png', contentTypes: ['image/png'] },
          { extension: 'webp', contentTypes: ['image/webp'] },
        ],
      },
    },
  }
}
export function uploadFixture(size = 100): UploadStatus {
  const partSize = Math.max(Math.ceil(size / 50), 5242880)
  return {
    id: mediaUploadId,
    assetId: mediaAssetId,
    status: 'pending',
    sizeBytes: String(size),
    partSizeBytes: String(partSize),
    partCount: Math.ceil(size / partSize),
    partConcurrency: 3,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    completedAt: null,
    uploadedBytes: '0',
    parts: [],
    failureCode: null,
    processing: {
      state: 'uploading',
      jobState: null,
      progressSeconds: 0,
      attempts: 0,
      failureCode: null,
      verifiedReadyAt: null,
    },
  }
}
export function descriptorFixture(): UploadDescriptor {
  const status = uploadFixture(3)
  return {
    id: status.id,
    assetId: status.assetId,
    status: status.status,
    filename: 'video.mp4',
    contentType: 'video/mp4',
    sizeBytes: status.sizeBytes,
    partSizeBytes: status.partSizeBytes,
    partCount: status.partCount,
    expiresAt: status.expiresAt,
    completedAt: null,
    failureCode: null,
    expectedSha256: 'a'.repeat(64),
    canResume: true,
  }
}
