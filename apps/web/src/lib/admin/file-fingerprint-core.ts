import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

export const HASH_CHUNK_BYTES = 4 * 1024 * 1024

export async function fingerprintFile(
  file: Pick<Blob, 'size' | 'slice'>,
  options: {
    signal?: AbortSignal
    onProgress?: (bytes: number) => void
    chunkBytes?: number
  } = {},
): Promise<string> {
  const chunkBytes = options.chunkBytes ?? HASH_CHUNK_BYTES
  if (
    !Number.isSafeInteger(file.size) ||
    file.size < 0 ||
    !Number.isSafeInteger(chunkBytes) ||
    chunkBytes < 1 ||
    chunkBytes > HASH_CHUNK_BYTES
  ) {
    throw new RangeError('Invalid file size or hash chunk size')
  }
  const hash = sha256.create()
  try {
    options.signal?.throwIfAborted()
    for (let offset = 0; offset < file.size; offset += chunkBytes) {
      options.signal?.throwIfAborted()
      const end = Math.min(offset + chunkBytes, file.size)
      const chunk = new Uint8Array(await file.slice(offset, end).arrayBuffer())
      options.signal?.throwIfAborted()
      if (chunk.byteLength !== end - offset) {
        throw new Error('File changed while reading')
      }
      hash.update(chunk)
      options.onProgress?.(end)
    }
    options.signal?.throwIfAborted()
    return bytesToHex(hash.digest())
  } finally {
    hash.destroy()
  }
}
