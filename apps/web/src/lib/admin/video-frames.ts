// Frames are taken from the video file already on the admin's machine; nothing
// extra is uploaded. Anything the browser cannot decode falls back to uploading
// an image instead.
export type VideoFrame = {
  time: number
  file: File
  previewUrl: string
}
export class FrameExtractionError extends Error {
  constructor(
    readonly code: 'UNSUPPORTED' | 'TIMEOUT' | 'ABORTED' | 'NO_FRAMES',
    message: string,
  ) {
    super(message)
  }
}
const FRAME_FRACTIONS = [0.1, 0.3, 0.5, 0.7, 0.9]

// Spread frames across the video, avoiding the very first and last frames
// (often black). Always returns distinct, ascending, in-range times.
export function frameTimes(duration: number, count = FRAME_FRACTIONS.length) {
  if (!Number.isFinite(duration) || duration <= 0 || count < 1) return []
  const fractions =
    count === FRAME_FRACTIONS.length
      ? FRAME_FRACTIONS
      : Array.from({ length: count }, (_, i) => (i + 1) / (count + 1))
  const last = Math.max(0, duration - 0.05)
  const times = fractions.map((f) =>
    Math.min(last, Math.round(duration * f * 100) / 100),
  )
  return Array.from(new Set(times))
}
export function formatFrameTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const rest = String(whole % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}
export function frameFileName(time: number) {
  const whole = Math.max(0, Math.floor(time))
  return `frame-${String(Math.floor(whole / 60)).padStart(2, '0')}-${String(whole % 60).padStart(2, '0')}.jpg`
}
// Keep the capture within what the cover needs (1080 × 1920) without upscaling.
export function captureSize(width: number, height: number) {
  const scale = Math.min(1, 1080 / width, 1920 / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

type Listener = () => void
export type VideoLike = {
  muted: boolean
  preload: string
  playsInline: boolean
  src: string
  currentTime: number
  readonly duration: number
  readonly videoWidth: number
  readonly videoHeight: number
  addEventListener: (type: string, listener: Listener) => void
  removeEventListener: (type: string, listener: Listener) => void
  removeAttribute: (name: string) => void
  load: () => void
}
export type CanvasLike = {
  width: number
  height: number
  getContext: (type: '2d') => {
    drawImage: (
      source: unknown,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => void
  } | null
  toBlob: (
    callback: (blob: Blob | null) => void,
    type: string,
    quality: number,
  ) => void
}
export type FrameEnv = {
  createVideo: () => VideoLike
  createCanvas: () => CanvasLike
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
  timeoutMs?: number
}
const browserEnv = (): FrameEnv => ({
  createVideo: () => document.createElement('video'),
  createCanvas: () => document.createElement('canvas') as unknown as CanvasLike,
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
})

function once(
  video: VideoLike,
  event: string,
  timeoutMs: number,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const done = (fn: () => void) => {
      clearTimeout(timer)
      video.removeEventListener(event, onEvent)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
      fn()
    }
    const onEvent = () => done(resolve)
    const onError = () =>
      done(() =>
        reject(
          new FrameExtractionError(
            'UNSUPPORTED',
            'This video cannot be read in the browser.',
          ),
        ),
      )
    const onAbort = () =>
      done(() =>
        reject(
          new FrameExtractionError(
            'ABORTED',
            'Frame extraction was cancelled.',
          ),
        ),
      )
    const timer = setTimeout(
      () =>
        done(() =>
          reject(
            new FrameExtractionError(
              'TIMEOUT',
              'Reading the video took too long.',
            ),
          ),
        ),
      timeoutMs,
    )
    video.addEventListener(event, onEvent)
    video.addEventListener('error', onError)
    if (signal?.aborted) onAbort()
    else signal?.addEventListener('abort', onAbort)
  })
}
export async function extractFramesWith(
  env: FrameEnv,
  file: File,
  options: { count?: number; signal?: AbortSignal } = {},
): Promise<VideoFrame[]> {
  const timeoutMs = env.timeoutMs ?? 15000
  const url = env.createObjectURL(file)
  const video = env.createVideo()
  const created: string[] = []
  try {
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const ready = once(video, 'loadedmetadata', timeoutMs, options.signal)
    video.src = url
    video.load()
    await ready
    const times = frameTimes(video.duration, options.count)
    if (!video.videoWidth || !video.videoHeight || times.length === 0)
      throw new FrameExtractionError(
        'UNSUPPORTED',
        'This video cannot be read in the browser.',
      )
    const size = captureSize(video.videoWidth, video.videoHeight)
    const frames: VideoFrame[] = []
    for (const time of times) {
      const seeked = once(video, 'seeked', timeoutMs, options.signal)
      video.currentTime = time
      await seeked
      const canvas = env.createCanvas()
      canvas.width = size.width
      canvas.height = size.height
      const context = canvas.getContext('2d')
      if (!context)
        throw new FrameExtractionError(
          'UNSUPPORTED',
          'This browser cannot capture frames.',
        )
      context.drawImage(video, 0, 0, size.width, size.height)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      )
      if (!blob) continue
      const previewUrl = env.createObjectURL(blob)
      created.push(previewUrl)
      frames.push({
        time,
        file: new File([blob], frameFileName(time), { type: 'image/jpeg' }),
        previewUrl,
      })
    }
    if (frames.length === 0)
      throw new FrameExtractionError(
        'NO_FRAMES',
        'No frames could be captured.',
      )
    created.length = 0
    return frames
  } catch (error) {
    for (const previewUrl of created) env.revokeObjectURL(previewUrl)
    throw error
  } finally {
    video.removeAttribute('src')
    video.load()
    env.revokeObjectURL(url)
  }
}
export const extractVideoFrames = (
  file: File,
  options?: { count?: number; signal?: AbortSignal },
) => extractFramesWith(browserEnv(), file, options)
