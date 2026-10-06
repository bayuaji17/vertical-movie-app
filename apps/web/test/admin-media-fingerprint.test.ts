import { createHash } from 'node:crypto'
import { describe, expect, test } from 'bun:test'
import {
  fingerprintFile,
  HASH_CHUNK_BYTES,
} from '../src/lib/admin/file-fingerprint-core'

describe('bounded file fingerprint', () => {
  for (const size of [0, 1, 16, 17, 65, HASH_CHUNK_BYTES + 19]) {
    test(`matches independent SHA-256 oracle for ${size} bytes`, async () => {
      const bytes = new Uint8Array(size).map((_, i) => i % 251)
      const seen: number[] = []
      const digest = await fingerprintFile(new Blob([bytes]), {
        chunkBytes: size > 100 ? HASH_CHUNK_BYTES : 16,
        onProgress: (n) => seen.push(n),
      })
      expect(digest).toBe(createHash('sha256').update(bytes).digest('hex'))
      expect(seen.at(-1) ?? 0).toBe(size)
    })
  }

  test('same name and size cannot disguise different content', async () => {
    const a = new File(['abc'], 'video.mp4')
    const b = new File(['abd'], 'video.mp4')
    expect(await fingerprintFile(a)).not.toBe(await fingerprintFile(b))
  })

  test('cancellation after a read suppresses progress and result', async () => {
    const controller = new AbortController()
    const progress: number[] = []
    const file = {
      size: 2,
      slice: () =>
        ({
          arrayBuffer: async () => {
            controller.abort()
            return new ArrayBuffer(2)
          },
        }) as Blob,
    }
    await expect(
      fingerprintFile(file, {
        signal: controller.signal,
        onProgress: (n) => progress.push(n),
      }),
    ).rejects.toThrow()
    expect(progress).toEqual([])
  })

  test('never requests more than one bounded chunk', async () => {
    const sizes: number[] = []
    await fingerprintFile({
      size: HASH_CHUNK_BYTES * 2 + 1,
      slice: (start = 0, end = 0) => {
        sizes.push(end - start)
        return new Blob([new Uint8Array(end - start)])
      },
    })
    expect(sizes).toEqual([HASH_CHUNK_BYTES, HASH_CHUNK_BYTES, 1])
  })
})
