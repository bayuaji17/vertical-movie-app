import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { CoverFramePicker } from '../src/components/admin/setup/cover-frame-picker'
import {
  FrameExtractionError,
  captureSize,
  extractFramesWith,
  formatFrameTime,
  frameFileName,
  frameTimes,
} from '../src/lib/admin/video-frames'
import type {
  CanvasLike,
  FrameEnv,
  VideoLike,
} from '../src/lib/admin/video-frames'

function fakeEnv(
  options: {
    duration?: number
    width?: number
    height?: number
    silent?: boolean
    brokenBlob?: boolean
  } = {},
) {
  const urls = new Set<string>()
  const log = { seeks: [] as number[], revoked: [] as string[] }
  let n = 0
  const env: FrameEnv = {
    timeoutMs: 20,
    createObjectURL: () => {
      const url = `blob:${++n}`
      urls.add(url)
      return url
    },
    revokeObjectURL: (url) => {
      urls.delete(url)
      log.revoked.push(url)
    },
    createVideo: () => {
      const listeners = new Map<string, Set<() => void>>()
      const fire = (type: string) =>
        queueMicrotask(() => listeners.get(type)?.forEach((fn) => fn()))
      const video: VideoLike = {
        muted: false,
        preload: '',
        playsInline: false,
        src: '',
        duration: options.duration ?? 100,
        videoWidth: options.width ?? 1080,
        videoHeight: options.height ?? 1920,
        addEventListener: (type: string, fn: () => void) => {
          if (!listeners.has(type)) listeners.set(type, new Set())
          listeners.get(type)?.add(fn)
        },
        removeEventListener: (type: string, fn: () => void) =>
          void listeners.get(type)?.delete(fn),
        removeAttribute: () => undefined,
        load: () => {
          if (video.src && !options.silent) fire('loadedmetadata')
        },
        set currentTime(value: number) {
          log.seeks.push(value)
          if (!options.silent) fire('seeked')
        },
        get currentTime() {
          return log.seeks.at(-1) ?? 0
        },
      }
      return video
    },
    createCanvas: (): CanvasLike => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => undefined }),
      toBlob: (callback) =>
        callback(
          options.brokenBlob ? null : new Blob(['jpg'], { type: 'image/jpeg' }),
        ),
    }),
  }
  return { env, urls, log }
}
const file = new File(['v'], 'film.mp4', { type: 'video/mp4' })

test('frame times spread across the video, stay in range and never repeat', () => {
  expect(frameTimes(100)).toEqual([10, 30, 50, 70, 90])
  expect(frameTimes(0)).toEqual([])
  expect(frameTimes(Number.NaN)).toEqual([])
  expect(frameTimes(Infinity)).toEqual([])
  expect(frameTimes(3, 3)).toEqual([0.75, 1.5, 2.25])
  const tiny = frameTimes(0.01)
  expect(new Set(tiny).size).toBe(tiny.length)
  expect(Math.max(...tiny)).toBeLessThanOrEqual(0.01)
  for (const t of frameTimes(12.5)) expect(t).toBeLessThan(12.5)
})

test('names and sizes are predictable and never upscale', () => {
  expect(formatFrameTime(42)).toBe('0:42')
  expect(formatFrameTime(662)).toBe('11:02')
  expect(formatFrameTime(-5)).toBe('0:00')
  expect(frameFileName(42.9)).toBe('frame-00-42.jpg')
  expect(frameFileName(662)).toBe('frame-11-02.jpg')
  expect(captureSize(1080, 1920)).toEqual({ width: 1080, height: 1920 })
  expect(captureSize(2160, 3840)).toEqual({ width: 1080, height: 1920 })
  expect(captureSize(540, 960)).toEqual({ width: 540, height: 960 })
})

test('extracts one JPEG file per frame and releases only the source URL', async () => {
  const { env, urls, log } = fakeEnv()
  const frames = await extractFramesWith(env, file)
  expect(frames).toHaveLength(5)
  expect(log.seeks).toEqual([10, 30, 50, 70, 90])
  expect(frames.map((f) => f.file.name)).toEqual([
    'frame-00-10.jpg',
    'frame-00-30.jpg',
    'frame-00-50.jpg',
    'frame-01-10.jpg',
    'frame-01-30.jpg',
  ])
  for (const frame of frames) expect(frame.file.type).toBe('image/jpeg')
  // Only the five preview URLs remain; the source object URL was revoked.
  expect(urls.size).toBe(5)
  expect(frames.every((f) => urls.has(f.previewUrl))).toBe(true)
})

test('undecodable, silent and cancelled videos fail with a typed error and leak no URLs', async () => {
  const unsupported = fakeEnv({ width: 0, height: 0 })
  const error = await extractFramesWith(unsupported.env, file).catch(
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(FrameExtractionError)
  expect((error as FrameExtractionError).code).toBe('UNSUPPORTED')
  expect(unsupported.urls.size).toBe(0)

  const silent = fakeEnv({ silent: true })
  const timeout = await extractFramesWith(silent.env, file).catch(
    (e: unknown) => e,
  )
  expect((timeout as FrameExtractionError).code).toBe('TIMEOUT')
  expect(silent.urls.size).toBe(0)

  const broken = fakeEnv({ brokenBlob: true })
  const none = await extractFramesWith(broken.env, file).catch(
    (e: unknown) => e,
  )
  expect((none as FrameExtractionError).code).toBe('NO_FRAMES')
  expect(broken.urls.size).toBe(0)

  const cancelled = fakeEnv()
  const controller = new AbortController()
  controller.abort()
  const aborted = await extractFramesWith(cancelled.env, file, {
    signal: controller.signal,
  }).catch((e: unknown) => e)
  expect((aborted as FrameExtractionError).code).toBe('ABORTED')
  expect(cancelled.urls.size).toBe(0)
})

test('picker starts in a labelled loading state with no frames offered yet', () => {
  const html = renderToString(
    <CoverFramePicker file={file} disabled={false} onPick={() => undefined} />,
  ).replaceAll('<!-- -->', '')
  expect(html).toContain('Capturing frames from your video')
  expect(html).not.toContain('Use frame at')
})
