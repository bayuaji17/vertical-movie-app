import { expect, test } from 'bun:test'
import { createPartTransport } from '../src/lib/admin/upload-transport'

function fixture() {
  let sent: Blob | undefined
  let stopped = 0
  const xhr = {
    upload: { onprogress: null },
    onload: null,
    onerror: null,
    ontimeout: null,
    onabort: null,
    status: 200,
    withCredentials: true,
    timeout: 0,
    open: (...args: unknown[]) => {
      expect(args[0]).toBe('PUT')
    },
    send: (blob: Blob) => {
      sent = blob
    },
    abort: () => {
      stopped++
    },
  } as unknown as XMLHttpRequest
  return {
    xhr,
    put: createPartTransport(() => xhr),
    sent: () => sent,
    stopped: () => stopped,
  }
}
test('direct PUT sends exactly the sliced bytes without app credentials and waits for 2xx', async () => {
  const f = fixture(),
    progress: number[] = []
  const file = new File(['abcdef'], 'sample.mp4'),
    blob = file.slice(2, 5)
  const pending = f.put('http://storage.test/signed', blob, {
    signal: new AbortController().signal,
    onProgress: (n) => progress.push(n),
  })
  expect(await f.sent()!.text()).toBe('cde')
  expect(f.xhr.withCredentials).toBe(false)
  f.xhr.upload.onprogress!.call(f.xhr, { loaded: 100 } as ProgressEvent)
  expect(progress).toEqual([3])
  f.xhr.onload!.call(f.xhr, {} as ProgressEvent)
  await pending
  expect(f.xhr.upload.onprogress).toBeNull()
})
test('abort detaches handlers before native abort; queued callbacks do not update progress', async () => {
  const f = fixture(),
    controller = new AbortController(),
    progress: number[] = []
  const pending = f.put('http://storage.test/signed', new Blob(['abc']), {
    signal: controller.signal,
    onProgress: (n) => progress.push(n),
  })
  const late = f.xhr.upload.onprogress!
  controller.abort()
  late.call(f.xhr, { loaded: 2 } as ProgressEvent)
  await expect(pending).rejects.toHaveProperty('name', 'AbortError')
  expect(progress).toEqual([])
  expect(f.stopped()).toBe(1)
  expect(f.xhr.onload).toBeNull()
})
test('opaque status, CORS and storage 403 produce safe errors without app auth status', async () => {
  for (const status of [0, 403, 500]) {
    const f = fixture()
    const pending = f.put(
      'http://storage.test/SECRET?signature=SECRET',
      new Blob(['a']),
      { signal: new AbortController().signal, onProgress: () => {} },
    )
    Object.defineProperty(f.xhr, 'status', { value: status })
    f.xhr.onload!.call(f.xhr, {} as ProgressEvent)
    await expect(pending).rejects.toMatchObject({
      status: 0,
      code: status === 403 ? 'STORAGE_SIGNATURE' : 'STORAGE_PUT_FAILED',
    })
    try {
      await pending
    } catch (error) {
      expect(String(error)).not.toContain('SECRET')
    }
  }
})
