import { MediaApiError } from './media-errors'

export type PartPut = (
  url: string,
  blob: Blob,
  options: { signal: AbortSignal; onProgress: (bytes: number) => void },
) => Promise<void>

export function createPartTransport(
  createXHR: () => XMLHttpRequest = () => new XMLHttpRequest(),
): PartPut {
  return (url, blob, { signal, onProgress }) =>
    new Promise((resolve, reject) => {
      let xhr: XMLHttpRequest | undefined
      let finished = false
      const finish = (error?: unknown) => {
        if (finished) return
        finished = true
        signal.removeEventListener('abort', abort)
        if (xhr) {
          xhr.upload.onprogress = null
          xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null
          xhr = undefined
        }
        if (error) reject(error)
        else resolve()
      }
      const stopped = () => new DOMException('Upload paused', 'AbortError')
      const abort = () => {
        const active = xhr
        finish(stopped())
        active?.abort()
      }
      if (signal.aborted) return abort()
      signal.addEventListener('abort', abort, { once: true })
      try {
        xhr = createXHR()
        xhr.open('PUT', url, true)
        xhr.withCredentials = false
        xhr.timeout = 120000
        xhr.upload.onprogress = ({ loaded }) => {
          if (!finished && Number.isFinite(loaded))
            onProgress(Math.min(blob.size, Math.max(0, loaded)))
        }
        // Only ListParts confirms stored bytes/ETags. Never expose response XML or signed URLs.
        xhr.onload = () => {
          if (!xhr) return
          const status = xhr.status
          finish(
            status >= 200 && status < 300
              ? undefined
              : new MediaApiError(
                  0,
                  status === 403 ? 'STORAGE_SIGNATURE' : 'STORAGE_PUT_FAILED',
                  'Storage upload could not be confirmed.',
                ),
          )
        }
        const uncertain = () =>
          finish(
            new MediaApiError(
              0,
              'STORAGE_NETWORK',
              'Storage upload could not be confirmed.',
            ),
          )
        xhr.onerror = uncertain
        xhr.ontimeout = uncertain
        xhr.onabort = () => finish(stopped())
        xhr.send(blob)
      } catch {
        finish(
          new MediaApiError(
            0,
            'STORAGE_NETWORK',
            'Storage upload could not be confirmed.',
          ),
        )
      }
    })
}

export const putPart = createPartTransport()
