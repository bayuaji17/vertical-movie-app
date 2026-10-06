import { expect, test } from 'bun:test'
import {
  inventoryNeedsPolling,
  mediaState,
  sessionNeedsPolling,
} from '../src/lib/admin/media-state'
import { mediaPollInterval } from '../src/lib/admin/media-queries'
import {
  inventoryFixture,
  uploadFixture,
  mediaAssetId,
} from './admin-media-fixture'

function inventory() {
  const value = inventoryFixture()
  value.source!.current = {
    id: mediaAssetId,
    state: 'uploaded',
    sizeBytes: '3',
    contentType: 'video/mp4',
    originalAvailable: true,
    verifiedReadyAt: null,
    width: null,
    height: null,
    durationMs: null,
    processing: {
      ...uploadFixture().processing,
      state: 'uploaded',
      jobState: 'queued',
    },
  }
  return value
}
test('completion and queued/running/retry media never claim ready; verified source is still not owner preview capability', () => {
  const value = inventory(),
    role = value.source!
  expect(mediaState(role).ready).toBe(false)
  expect(inventoryNeedsPolling(value)).toBe(true)
  expect(value.canPreview).toBe(false)
  for (const jobState of ['running', 'retry']) {
    role.current!.processing.jobState = jobState
    expect(mediaState(role).pending).toBe(true)
  }
  role.current!.state = 'ready'
  role.current!.verifiedReadyAt = new Date().toISOString()
  role.current!.originalAvailable = false
  expect(mediaState(role).ready).toBe(true)
  expect(inventoryNeedsPolling(value)).toBe(false)
  expect(value.canPreview).toBe(false)
})
test('terminal failure and unknown state stop loops and use neutral labels', () => {
  const value = inventory()
  value.source!.current!.state = 'failed'
  expect(inventoryNeedsPolling(value)).toBe(false)
  value.source!.current!.state = 'future-state'
  value.source!.current!.processing.jobState = 'future-job'
  expect(mediaState(value.source!).label).toContain('Status unavailable')
  expect(inventoryNeedsPolling(value)).toBe(false)
})
test('request-processed covers report Preparing cover and become Ready only after verified output', () => {
  const value = inventory(),
    role = value.poster
  role.canProcessPoster = true
  role.current = {
    id: mediaAssetId,
    state: 'uploaded',
    sizeBytes: '3',
    contentType: 'image/webp',
    originalAvailable: true,
    verifiedReadyAt: null,
    width: null,
    height: null,
    durationMs: null,
    processing: {
      ...uploadFixture().processing,
      state: 'uploaded',
      jobState: 'queued',
    },
  }
  expect(mediaState(role, 'poster')).toEqual({
    label: 'Preparing cover',
    ready: false,
    pending: true,
  })
  expect(inventoryNeedsPolling(value)).toBe(true)
  role.current.state = 'ready'
  role.current.verifiedReadyAt = new Date().toISOString()
  expect(mediaState(role, 'poster')).toEqual({
    label: 'Ready',
    ready: true,
    pending: false,
  })
})
test('legacy worker posters keep their worker-processing status label', () => {
  const value = inventory(),
    role = value.poster
  role.lastAttempt = {
    ...uploadFixture(),
    filename: 'legacy.webp',
    contentType: 'image/webp',
    expectedSha256: 'a'.repeat(64),
    canResume: false,
  }
  role.current = {
    id: mediaAssetId,
    state: 'uploaded',
    sizeBytes: '3',
    contentType: 'image/webp',
    originalAvailable: true,
    verifiedReadyAt: null,
    width: null,
    height: null,
    durationMs: null,
    processing: {
      ...uploadFixture().processing,
      state: 'uploaded',
      jobState: 'queued',
    },
  }
  expect(mediaState(role, 'poster')).toEqual({
    label: 'Upload completed · Waiting for processing',
    ready: false,
    pending: true,
  })
})
test('poll interval stops while hidden/offline/terminal and completed jobs remain observed', () => {
  expect(mediaPollInterval(true, true, true)).toBe(5000)
  expect(mediaPollInterval(true, false, true)).toBe(false)
  expect(mediaPollInterval(true, true, false)).toBe(false)
  expect(mediaPollInterval(false, true, true)).toBe(false)
  const status = uploadFixture()
  status.status = 'completed'
  status.processing.state = 'uploaded'
  status.processing.jobState = 'queued'
  expect(sessionNeedsPolling(status)).toBe(true)
  status.processing.state = 'ready'
  status.processing.jobState = 'succeeded'
  expect(sessionNeedsPolling(status)).toBe(false)
  status.status = 'expired'
  expect(sessionNeedsPolling(status)).toBe(false)
})
