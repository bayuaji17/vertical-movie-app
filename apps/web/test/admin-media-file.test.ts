import { test, expect } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  describeMediaFile,
  verifyReselectedFile,
} from '../src/lib/admin/media-file'
import { fingerprintFile } from '../src/lib/admin/file-fingerprint-core'
import { hashFile } from '../src/lib/admin/file-fingerprint'
import type { FingerprintWorker } from '../src/lib/admin/file-fingerprint'
import { inventoryFixture, descriptorFixture } from './admin-media-fixture'

test('selection follows server limits and rejects empty, oversized and contradictory media before hashing', () => {
  const inventory = inventoryFixture()
  for (const kind of ['source', 'poster'] as const) {
    const name = kind === 'source' ? 'video.mp4' : 'cover.png',
      type = kind === 'source' ? 'video/mp4' : 'image/png',
      max = Number(inventory.config[kind].maxBytes)
    expect(
      describeMediaFile({ name, type, size: max }, kind, inventory).sizeBytes,
    ).toBe(String(max))
    for (const size of [0, max + 1])
      expect(() =>
        describeMediaFile({ name, type, size }, kind, inventory),
      ).toThrow()
  }
  expect(
    describeMediaFile(
      { name: 'MOVIE.MKV', type: '', size: 100 },
      'source',
      inventory,
    ).contentType,
  ).toBe('video/x-matroska')
  for (const file of [
    { name: 'video.mp4', type: 'image/png', size: 100 },
    { name: 'cover.gif', type: 'image/gif', size: 100 },
    { name: 'folder/video.mp4', type: 'video/mp4', size: 100 },
  ])
    expect(() => describeMediaFile(file, 'source', inventory)).toThrow()
  inventory.ownerType = 'series'
  expect(() =>
    describeMediaFile(
      { name: 'video.mp4', type: 'video/mp4', size: 100 },
      'source',
      inventory,
    ),
  ).toThrow()
})
test('reselection verifies all bytes even when name, size and media type are identical', async () => {
  const descriptor = descriptorFixture(),
    correct = new File(['abc'], 'video.mp4', { type: 'video/mp4' })
  descriptor.expectedSha256 = createHash('sha256').update('abc').digest('hex')
  const hash = async (file: File) => fingerprintFile(file)
  expect(await verifyReselectedFile(correct, descriptor, {}, hash)).toBe(
    descriptor.expectedSha256,
  )
  await expect(
    verifyReselectedFile(
      new File(['abd'], 'video.mp4', { type: 'video/mp4' }),
      descriptor,
      {},
      hash,
    ),
  ).rejects.toMatchObject({ code: 'FILE_MISMATCH' })
  let calls = 0
  await expect(
    verifyReselectedFile(
      correct,
      { ...descriptor, expectedSha256: null },
      {},
      async () => {
        calls++
        return ''
      },
    ),
  ).rejects.toMatchObject({ code: 'LEGACY_UPLOAD' })
  await expect(
    verifyReselectedFile(
      correct,
      { ...descriptor, expiresAt: new Date(0).toISOString() },
      {},
      hash,
    ),
  ).rejects.toMatchObject({ code: 'UPLOAD_EXPIRED' })
  expect(calls).toBe(0)
})
test('worker bridge termination suppresses already queued replies and releases handlers', async () => {
  const controller = new AbortController(),
    progress: number[] = []
  let terminated = 0
  const worker: FingerprintWorker = {
    onmessage: null,
    onerror: null,
    postMessage: () => {},
    terminate: () => {
      terminated++
    },
  }
  const pending = hashFile(new File(['abc'], 'video.mp4'), {
    signal: controller.signal,
    onProgress: (bytes) => progress.push(bytes),
    createWorker: () => worker,
  })
  const late = worker.onmessage!
  controller.abort()
  late.call(worker, { data: { type: 'progress', bytes: 3 } } as MessageEvent)
  late.call(worker, {
    data: { type: 'complete', digest: 'a'.repeat(64) },
  } as MessageEvent)
  await expect(pending).rejects.toHaveProperty('name', 'AbortError')
  expect(progress).toEqual([])
  expect(terminated).toBe(1)
  expect(worker.onmessage).toBeNull()
  expect(worker.onerror).toBeNull()
})
test('worker success and malformed progress both terminate the worker', async () => {
  for (const invalid of [false, true]) {
    let stopped = 0
    const worker: FingerprintWorker = {
      onmessage: null,
      onerror: null,
      postMessage: () => {
        queueMicrotask(() =>
          worker.onmessage?.call(worker, {
            data: invalid
              ? { type: 'progress', bytes: 999 }
              : { type: 'complete', digest: 'a'.repeat(64) },
          } as MessageEvent),
        )
      },
      terminate: () => {
        stopped++
      },
    }
    const pending = hashFile(new File(['abc'], 'video.mp4'), {
      createWorker: () => worker,
    })
    if (invalid)
      await expect(pending).rejects.toMatchObject({ code: 'FILE_READ_ERROR' })
    else expect(await pending).toBe('a'.repeat(64))
    expect(stopped).toBe(1)
  }
})
