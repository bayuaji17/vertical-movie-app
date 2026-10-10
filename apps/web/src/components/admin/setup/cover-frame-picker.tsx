import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import {
  FrameExtractionError,
  extractVideoFrames,
  formatFrameTime,
} from '#/lib/admin/video-frames'
import type { VideoFrame } from '#/lib/admin/video-frames'

type FrameState =
  | { status: 'loading' }
  | { status: 'ready'; frames: VideoFrame[] }
  | { status: 'failed'; message: string }

// Offers frames from the chosen video as cover candidates. Picking one hands a
// JPEG File to the existing crop dialog; it never replaces the image upload.
export function CoverFramePicker({
  file,
  disabled,
  onPick,
  extract = extractVideoFrames,
}: {
  file: File
  disabled: boolean
  onPick: (frame: File) => void
  extract?: typeof extractVideoFrames
}) {
  const [state, setState] = useState<FrameState>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    let urls: string[] = []
    setState({ status: 'loading' })
    extract(file, { signal: controller.signal }).then(
      (frames) => {
        if (controller.signal.aborted) {
          for (const frame of frames) URL.revokeObjectURL(frame.previewUrl)
          return
        }
        urls = frames.map((frame) => frame.previewUrl)
        setState({ status: 'ready', frames })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'failed',
          message:
            error instanceof FrameExtractionError
              ? "We couldn't read frames from this video in your browser."
              : 'Frames could not be captured.',
        })
      },
    )
    return () => {
      controller.abort()
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [file, extract])
  if (state.status === 'loading')
    return (
      <div role="status" aria-label="Capturing frames" className="flex gap-2">
        <span className="sr-only">Capturing frames from your video…</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="aspect-[9/16] w-14 rounded-xl" />
        ))}
      </div>
    )
  if (state.status === 'failed')
    return (
      <Alert role="status">
        <AlertTitle>Pick a cover image instead</AlertTitle>
        <AlertDescription>
          {state.message} You can upload an image below.
        </AlertDescription>
      </Alert>
    )
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Pick a frame from your video</p>
      <ul className="flex flex-wrap gap-2" aria-label="Frames from your video">
        {state.frames.map((frame) => (
          <li key={frame.time}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(frame.file)}
              aria-label={`Use frame at ${formatFrameTime(frame.time)}`}
              className="overflow-hidden rounded-xl border outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <img
                src={frame.previewUrl}
                alt=""
                className="aspect-[9/16] w-14 object-cover sm:w-16"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
