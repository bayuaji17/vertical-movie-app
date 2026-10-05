import { MediaApiError } from './media-errors'

export type FingerprintReply =
  | { type: 'progress'; bytes: number }
  | { type: 'complete'; digest: string }
  | { type: 'error' }
export type FingerprintWorker = Pick<Worker, 'postMessage' | 'terminate'> & {
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
}
const createWorker = () =>
  new Worker(new URL('./file-fingerprint.worker.ts', import.meta.url), {
    type: 'module',
  })
export function hashFile(
  file: File,
  options: {
    signal?: AbortSignal
    onProgress?: (bytes: number) => void
    createWorker?: () => FingerprintWorker
  } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    let worker: FingerprintWorker | undefined
    let finished = false
    const finish = (digest?: string, error?: unknown) => {
      if (finished) return
      finished = true
      options.signal?.removeEventListener('abort', abort)
      if (worker) {
        worker.onmessage = null
        worker.onerror = null
        worker.terminate()
        worker = undefined
      }
      if (error) reject(error)
      else if (digest) resolve(digest)
    }
    const abort = () =>
      finish(undefined, new DOMException('File check stopped', 'AbortError'))
    if (options.signal?.aborted) {
      abort()
      return
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    try {
      worker = (options.createWorker ?? createWorker)()
      worker.onmessage = ({ data }: MessageEvent<FingerprintReply>) => {
        if (finished) return
        if (data.type === 'progress') {
          if (
            !Number.isSafeInteger(data.bytes) ||
            data.bytes < 0 ||
            data.bytes > file.size
          ) {
            finish(
              undefined,
              new MediaApiError(0, 'FILE_READ_ERROR', 'File check failed.'),
            )
            return
          }
          options.onProgress?.(data.bytes)
        } else if (
          data.type === 'complete' &&
          /^[a-f0-9]{64}$/.test(data.digest)
        )
          finish(data.digest)
        else
          finish(
            undefined,
            new MediaApiError(0, 'FILE_READ_ERROR', 'File check failed.'),
          )
      }
      worker.onerror = (event) => {
        event.preventDefault()
        finish(
          undefined,
          new MediaApiError(0, 'FILE_READ_ERROR', 'File check failed.'),
        )
      }
      worker.postMessage(file)
    } catch {
      finish(
        undefined,
        new MediaApiError(
          0,
          'FILE_CHECK_UNAVAILABLE',
          'File checking is unavailable in this browser.',
        ),
      )
    }
  })
}
