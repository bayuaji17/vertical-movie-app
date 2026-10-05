import type { MediaClient, UploadStatus } from './media-client'
import { MediaApiError } from './media-errors'
import {
  aggregateProgress,
  storedParts,
  uploadGeometry,
} from './upload-progress'
import type { UploadProgress } from './upload-progress'
import { putPart } from './upload-transport'
import type { PartPut } from './upload-transport'

export function uploadDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      reject(new DOMException('Upload paused', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}
export async function scheduleUpload(options: {
  file: File
  id: string
  client: Pick<MediaClient, 'status' | 'signPart'>
  signal: AbortSignal
  onProgress: (progress: UploadProgress) => void
  put?: PartPut
  delay?: typeof uploadDelay
  random?: () => number
}) {
  const local = new AbortController(),
    signal = local.signal
  const abort = () => local.abort()
  if (options.signal.aborted) local.abort()
  options.signal.addEventListener('abort', abort, { once: true })
  const check = () => {
    if (signal.aborted) throw new DOMException('Upload paused', 'AbortError')
  }
  let latest: UploadStatus
  try {
    check()
    latest = await options.client.status(options.id, signal)
    check()
    const geometry = uploadGeometry(latest, options.file.size),
      verified = new Map<number, number>(),
      active = new Map<number, number>()
    const publish = () => {
      check()
      options.onProgress(aggregateProgress(geometry.size, verified, active))
    }
    const merge = (status: UploadStatus) => {
      check()
      const fresh = uploadGeometry(status, options.file.size)
      if (
        fresh.partSize !== geometry.partSize ||
        fresh.count !== geometry.count
      )
        throw new MediaApiError(
          0,
          'INVALID_RESPONSE',
          'Upload geometry changed.',
        )
      if (status.status !== 'pending')
        throw new MediaApiError(
          409,
          'UPLOAD_STATE_CONFLICT',
          'Check upload status.',
        )
      if (Date.parse(status.expiresAt) <= Date.now())
        throw new MediaApiError(409, 'UPLOAD_EXPIRED', 'Upload expired.')
      for (const [n, bytes] of storedParts(status, geometry))
        verified.set(n, bytes)
      latest = status
      publish()
    }
    merge(latest)
    const reconcile = async () => {
      check()
      merge(await options.client.status(options.id, signal))
    }
    const queue = Array.from(
      { length: geometry.count },
      (_, i) => i + 1,
    ).filter((n) => !verified.has(n))
    let index = 0
    const worker = async () => {
      while (index < queue.length) {
        check()
        const n = queue[index++]
        for (let attempt = 0; attempt < 3 && !verified.has(n); attempt++) {
          check()
          if (Date.parse(latest.expiresAt) <= Date.now())
            throw new MediaApiError(409, 'UPLOAD_EXPIRED', 'Upload expired.')
          let failure: unknown
          try {
            const signed = await options.client.signPart(options.id, n, signal)
            check()
            if (!signed.alreadyUploaded) {
              if (!signed.url || Date.parse(signed.expiresAt) <= Date.now())
                throw new MediaApiError(
                  0,
                  'STORAGE_SIGNATURE',
                  'Upload authorization expired.',
                )
              const start = (n - 1) * geometry.partSize
              await (options.put ?? putPart)(
                signed.url,
                options.file.slice(start, start + geometry.length(n)),
                {
                  signal,
                  onProgress: (bytes) => {
                    if (!signal.aborted) {
                      active.set(
                        n,
                        Math.min(geometry.length(n), Math.max(0, bytes)),
                      )
                      publish()
                    }
                  },
                },
              )
            }
          } catch (error) {
            check()
            if (
              error instanceof MediaApiError &&
              error.status > 0 &&
              error.code !== 'STORAGE_UNAVAILABLE'
            )
              throw error
            failure = error
          }
          active.delete(n)
          // A timed out PUT may have succeeded. ListParts is required before any replay.
          await reconcile()
          if (verified.has(n)) break
          if (attempt === 2)
            throw (
              failure ??
              new MediaApiError(
                0,
                'STORAGE_PUT_FAILED',
                'Stored bytes could not be confirmed.',
              )
            )
          await (options.delay ?? uploadDelay)(
            2 ** attempt * 1000 +
              Math.floor((options.random ?? Math.random)() * 250),
            signal,
          )
        }
      }
    }
    const workers = Array.from(
      { length: Math.min(geometry.concurrency, queue.length) },
      () =>
        worker().catch((error) => {
          local.abort()
          throw error
        }),
    )
    const results = await Promise.allSettled(workers)
    const failure = results.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
    await reconcile()
    if (verified.size !== geometry.count)
      throw new MediaApiError(
        0,
        'STORAGE_PUT_FAILED',
        'Upload parts are not confirmed.',
      )
    return latest
  } finally {
    local.abort()
    options.signal.removeEventListener('abort', abort)
  }
}
