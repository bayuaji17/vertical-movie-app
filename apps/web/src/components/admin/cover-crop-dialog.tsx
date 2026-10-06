import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import {
  calculateCoverCrop,
  COVER_OUTPUT_HEIGHT,
  COVER_OUTPUT_WIDTH,
} from '#/lib/admin/cover-crop'
import { CoverRasterError, CoverRasterScope } from '#/lib/admin/cover-raster'
import type { CoverRasterAttempt } from '#/lib/admin/cover-raster'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Slider } from '#/components/ui/slider'

const PREVIEW_WIDTH = 540
const PREVIEW_HEIGHT = 960

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function CoverCropDialog({
  open,
  onOpenChange,
  sourceFile,
  ownerKey,
  maxBytes,
  onUse,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceFile?: File
  ownerKey: string
  maxBytes: number
  onUse: (file: File) => void
}) {
  const scope = useRef(new CoverRasterScope()),
    attempt = useRef<CoverRasterAttempt | undefined>(undefined),
    canvas = useRef<HTMLCanvasElement>(null),
    drag = useRef<
      | {
          pointerId: number
          x: number
          y: number
          centerX: number
          centerY: number
        }
      | undefined
    >(undefined)
  const [bitmap, setBitmap] = useState<ImageBitmap>(),
    [loading, setLoading] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState<string>(),
    [zoom, setZoom] = useState(1),
    [centerX, setCenterX] = useState(0.5),
    [centerY, setCenterY] = useState(0.5)

  useEffect(() => {
    if (!open || !sourceFile) {
      scope.current.dispose()
      attempt.current = undefined
      setBitmap(undefined)
      setLoading(false)
      setExporting(false)
      drag.current = undefined
      return
    }

    const current = scope.current.begin()
    attempt.current = current
    setBitmap(undefined)
    setLoading(true)
    setError(undefined)
    setExporting(false)
    setZoom(1)
    setCenterX(0.5)
    setCenterY(0.5)
    drag.current = undefined

    void scope.current
      .decode(sourceFile, current)
      .then((decoded) => {
        if (!current.isCurrent()) return
        setBitmap(decoded)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!current.isCurrent()) return
        setLoading(false)
        setError(
          cause instanceof Error
            ? cause.message
            : 'The image could not be opened. Choose another image file.',
        )
      })

    return () => {
      if (attempt.current === current) attempt.current = undefined
      scope.current.dispose()
    }
  }, [open, ownerKey, sourceFile])

  const cropResult = useMemo(() => {
    if (!bitmap) return undefined
    try {
      return {
        crop: calculateCoverCrop(bitmap.width, bitmap.height, {
          zoom,
          centerX,
          centerY,
        }),
      }
    } catch (cause) {
      return {
        error:
          cause instanceof Error
            ? cause.message
            : 'This image cannot be cropped to the required dimensions.',
      }
    }
  }, [bitmap, centerX, centerY, zoom])
  const crop = cropResult && 'crop' in cropResult ? cropResult.crop : undefined
  const cropError =
    cropResult && 'error' in cropResult ? cropResult.error : undefined

  useEffect(() => {
    const target = canvas.current
    if (!target || !bitmap || !crop) return
    target.width = PREVIEW_WIDTH
    target.height = PREVIEW_HEIGHT
    const context = target.getContext('2d')
    if (!context) {
      setError('Cover cropping is unavailable in this browser.')
      return
    }
    context.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      PREVIEW_WIDTH,
      PREVIEW_HEIGHT,
    )
  }, [bitmap, crop])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      scope.current.dispose()
      attempt.current = undefined
      drag.current = undefined
    }
    onOpenChange(nextOpen)
  }

  const reset = () => {
    setZoom(1)
    setCenterX(0.5)
    setCenterY(0.5)
  }

  const changeZoom = (nextZoom: number) => {
    setZoom(Math.max(1, Math.min(crop?.maxZoom ?? 1, nextZoom)))
  }

  const onPreviewKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!crop) return
    const panStep = 0.04,
      zoomStep = Math.max(0.05, (crop.maxZoom - 1) / 10)
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        setCenterX((current) => clamp(current - panStep))
        break
      case 'ArrowRight':
        event.preventDefault()
        setCenterX((current) => clamp(current + panStep))
        break
      case 'ArrowUp':
        event.preventDefault()
        setCenterY((current) => clamp(current - panStep))
        break
      case 'ArrowDown':
        event.preventDefault()
        setCenterY((current) => clamp(current + panStep))
        break
      case '+':
      case '=':
        event.preventDefault()
        changeZoom(zoom + zoomStep)
        break
      case '-':
        event.preventDefault()
        changeZoom(zoom - zoomStep)
        break
      case 'Home':
      case '0':
        event.preventDefault()
        reset()
        break
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!crop || !bitmap) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      centerX,
      centerY,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current,
      target = canvas.current
    if (
      !start ||
      start.pointerId !== event.pointerId ||
      !target ||
      !crop ||
      !bitmap
    )
      return
    const bounds = target.getBoundingClientRect(),
      horizontalRange = bitmap.width - crop.width,
      verticalRange = bitmap.height - crop.height
    if (horizontalRange > 0 && bounds.width > 0)
      setCenterX(
        clamp(
          start.centerX -
            ((event.clientX - start.x) * crop.width) /
              bounds.width /
              horizontalRange,
        ),
      )
    if (verticalRange > 0 && bounds.height > 0)
      setCenterY(
        clamp(
          start.centerY -
            ((event.clientY - start.y) * crop.height) /
              bounds.height /
              verticalRange,
        ),
      )
  }

  const useCrop = async () => {
    const current = attempt.current
    if (!current?.isCurrent() || !crop || !sourceFile || exporting) return
    setExporting(true)
    setError(undefined)
    try {
      const file = await scope.current.export(sourceFile.name, crop, current, {
        maxBytes,
      })
      if (!current.isCurrent()) return
      onUse(file)
      handleOpenChange(false)
    } catch (cause) {
      if (!current.isCurrent()) return
      setError(
        cause instanceof CoverRasterError || cause instanceof Error
          ? cause.message
          : 'The cropped cover could not be saved. Try again.',
      )
    } finally {
      if (current.isCurrent()) setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Crop cover</DialogTitle>
          <DialogDescription>
            Position the image inside a 9:16 frame. The saved cover is{' '}
            {COVER_OUTPUT_WIDTH} × {COVER_OUTPUT_HEIGHT} pixels.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] sm:items-center">
          <div className="flex min-h-48 items-center justify-center rounded-2xl bg-muted/60 p-3">
            {loading && (
              <p role="status" className="text-sm text-muted-foreground">
                Preparing image…
              </p>
            )}
            {!loading && bitmap && crop && (
              <canvas
                ref={canvas}
                aria-label="Cover crop preview. Use arrow keys to reposition, plus or minus to zoom, and Home to reset."
                aria-describedby="cover-crop-instructions"
                className="h-auto max-h-[42dvh] w-auto max-w-full touch-none cursor-grab rounded-lg object-contain outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                onKeyDown={onPreviewKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={(event) => {
                  if (drag.current?.pointerId === event.pointerId)
                    drag.current = undefined
                }}
                onPointerCancel={() => {
                  drag.current = undefined
                }}
                tabIndex={0}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
              />
            )}
            {!loading && (!bitmap || !crop) && (
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {cropError ?? error ?? 'Preview is not available.'}
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  className="text-sm font-medium"
                  id="cover-crop-zoom-label"
                >
                  Zoom
                </label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <Slider
                aria-labelledby="cover-crop-zoom-label"
                aria-valuetext={`${Math.round(zoom * 100)} percent`}
                disabled={!crop || loading || exporting}
                min={1}
                max={Math.max(1, crop?.maxZoom ?? 1)}
                step={0.01}
                value={[zoom]}
                onValueChange={(value) =>
                  changeZoom(
                    typeof value === 'number' ? value : (value[0] ?? 1),
                  )
                }
              />
              <p
                id="cover-crop-instructions"
                className="text-sm text-muted-foreground"
              >
                Drag the image to reposition it. Use the slider to zoom. With
                the preview focused, use arrow keys to move, + or − to zoom, and
                Home to reset. Touch drag and the zoom slider work on mobile.
              </p>
              <Button
                className="min-h-11 w-fit"
                disabled={!bitmap || loading || exporting}
                onClick={reset}
                variant="outline"
              >
                Reset crop
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Crop area:{' '}
              {crop
                ? `${Math.floor(crop.width)} × ${Math.floor(crop.height)}`
                : '—'}{' '}
              px
              {' · '}Output: {COVER_OUTPUT_WIDTH} × {COVER_OUTPUT_HEIGHT} px
            </p>
          </div>
        </div>

        {(error || cropError) && (
          <p
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error ?? cropError}
          </p>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            className="min-h-11"
            disabled={exporting}
            onClick={() => handleOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="min-h-11"
            disabled={!crop || loading || exporting || !!error || !!cropError}
            onClick={() => void useCrop()}
          >
            {exporting ? 'Cropping…' : 'Use crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
