import { expect, test } from 'bun:test'
import { scheduleUpload } from '../src/lib/admin/upload-scheduler'
import {
  aggregateProgress,
  storedParts,
  uploadGeometry,
} from '../src/lib/admin/upload-progress'
import type { MediaClient } from '../src/lib/admin/media-client'
import type { PartPut } from '../src/lib/admin/upload-transport'
import { uploadFixture } from './admin-media-fixture'

function fixture(size: number) {
  const status = uploadFixture(size),
    file = new File([new Uint8Array(size)], 'video.mp4')
  let gets = 0,
    signs = 0
  const client: Pick<MediaClient, 'status' | 'signPart'> = {
    status: async () => {
      gets++
      return structuredClone(status)
    },
    signPart: async (_id, n) => {
      signs++
      return {
        partNumber: n,
        url: 'http://storage.test/' + n,
        expiresAt: status.expiresAt,
        alreadyUploaded: false,
      }
    },
  }
  const store = (n: number, bytes: number) => {
    status.parts.push({
      partNumber: n,
      etag: 'etag-' + n,
      sizeBytes: String(bytes),
    })
    status.uploadedBytes = String(
      status.parts.reduce((sum, p) => sum + Number(p.sizeBytes), 0),
    )
  }
  return { status, file, client, store, gets: () => gets, signs: () => signs }
}
test('geometry uses persisted server part size; skips confirmed parts and caps parallel PUTs at three', async () => {
  const f = fixture(5242880 * 4 + 17)
  f.store(1, 5242880)
  f.status.partConcurrency = 9
  let active = 0,
    peak = 0
  const sizes: number[] = [],
    progress: Array<{ sent: number; verified: number; total: number }> = []
  const put: PartPut = async (url, blob, { onProgress }) => {
    active++
    peak = Math.max(peak, active)
    sizes.push(blob.size)
    onProgress(blob.size)
    await Bun.sleep(5)
    f.store(Number(new URL(url).pathname.slice(1)), blob.size)
    active--
  }
  await scheduleUpload({
    file: f.file,
    id: f.status.id,
    client: f.client,
    signal: new AbortController().signal,
    onProgress: (p) => progress.push(p),
    put,
  })
  expect(peak).toBe(3)
  expect(sizes.sort((a, b) => a - b)).toEqual([17, 5242880, 5242880, 5242880])
  expect(f.signs()).toBe(4)
  expect(progress.at(-1)).toEqual({
    sent: f.file.size,
    verified: f.file.size,
    total: f.file.size,
  })
  expect(progress.every((p) => p.sent <= p.total && p.verified <= p.sent)).toBe(
    true,
  )
})
test('a successful but disconnected PUT is reconciled before retry and never replayed', async () => {
  const f = fixture(7)
  let puts = 0
  await scheduleUpload({
    file: f.file,
    id: f.status.id,
    client: f.client,
    signal: new AbortController().signal,
    onProgress: () => {},
    put: async (_url, blob) => {
      puts++
      f.store(1, blob.size)
      throw Error('lost response')
    },
  })
  expect(puts).toBe(1)
  expect(f.gets()).toBe(3)
})
test('failed progress resets; retries are bounded at three and backoff is one/two seconds', async () => {
  const f = fixture(7),
    waits: number[] = [],
    progress: number[] = []
  let puts = 0
  await expect(
    scheduleUpload({
      file: f.file,
      id: f.status.id,
      client: f.client,
      signal: new AbortController().signal,
      onProgress: (p) => progress.push(p.sent),
      put: async (_url, _blob, { onProgress }) => {
        puts++
        onProgress(6)
        throw Error('lost')
      },
      delay: async (ms) => {
        waits.push(ms)
      },
      random: () => 0,
    }),
  ).rejects.toThrow('lost')
  expect(puts).toBe(3)
  expect(waits).toEqual([1000, 2000])
  expect(progress.at(-1)).toBe(0)
  expect(Math.max(...progress)).toBe(6)
})
test('expiry and malformed stored parts stop before signing; offline pause stops all in-flight work', async () => {
  const f = fixture(8)
  f.status.expiresAt = new Date(0).toISOString()
  await expect(
    scheduleUpload({
      file: f.file,
      id: f.status.id,
      client: f.client,
      signal: new AbortController().signal,
      onProgress: () => {},
    }),
  ).rejects.toMatchObject({ code: 'UPLOAD_EXPIRED' })
  expect(f.signs()).toBe(0)
  f.status.expiresAt = new Date(Date.now() + 60000).toISOString()
  f.store(1, 7)
  expect(() => storedParts(f.status, uploadGeometry(f.status, 8))).toThrow()
  const g = fixture(5242880 * 4),
    controller = new AbortController()
  let starts = 0
  await expect(
    scheduleUpload({
      file: g.file,
      id: g.status.id,
      client: g.client,
      signal: controller.signal,
      onProgress: () => {},
      put: async (_url, _blob, { signal }) => {
        starts++
        controller.abort()
        if (signal.aborted) throw new DOMException('paused', 'AbortError')
      },
    }),
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(starts).toBeLessThanOrEqual(3)
  expect(aggregateProgress(8, new Map([[1, 8]]), new Map([[1, 8]]))).toEqual({
    sent: 8,
    verified: 8,
    total: 8,
  })
})
