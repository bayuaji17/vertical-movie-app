import { fingerprintFile } from './file-fingerprint-core'

self.onmessage = async ({ data }: MessageEvent<File>) => {
  try {
    if (!(data instanceof File)) throw new Error('Invalid file')
    const digest = await fingerprintFile(data, {
      onProgress: (bytes) => self.postMessage({ type: 'progress', bytes }),
    })
    self.postMessage({ type: 'complete', digest })
  } catch {
    self.postMessage({ type: 'error' })
  }
}
