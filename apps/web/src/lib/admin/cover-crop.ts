export const COVER_ASPECT_WIDTH = 9
export const COVER_ASPECT_HEIGHT = 16
export const COVER_OUTPUT_WIDTH = 1080
export const COVER_OUTPUT_HEIGHT = 1920
export const COVER_MAX_ZOOM = 4

export type CoverCrop = {
  sourceWidth: number
  sourceHeight: number
  x: number
  y: number
  width: number
  height: number
  zoom: number
  maxZoom: number
}

export class CoverCropError extends Error {
  constructor(
    readonly code: 'INVALID_DIMENSIONS',
    message: string,
  ) {
    super(message)
    this.name = 'CoverCropError'
  }
}

const validDimension = (value: number) =>
  Number.isSafeInteger(value) && value > 0

/**
 * Calculate an exact 9:16 source rectangle. `centerX` and `centerY` are
 * normalized within the available panning range (0 = left/top, 1 = right/bottom).
 * Zoom is relative to the largest 9:16 crop that fits without empty pixels.
 */
export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  options: { zoom?: number; centerX?: number; centerY?: number } = {},
): CoverCrop {
  if (!validDimension(sourceWidth) || !validDimension(sourceHeight))
    throw new CoverCropError(
      'INVALID_DIMENSIONS',
      'Image dimensions are invalid.',
    )

  const baseWidth = Math.min(
    sourceWidth,
    (sourceHeight * COVER_ASPECT_WIDTH) / COVER_ASPECT_HEIGHT,
  )
  // Source resolution is a quality recommendation. Export resizes this crop to
  // the standard output, so zoom stays available even for smaller images.
  const maxZoom = COVER_MAX_ZOOM

  const requestedZoom = options.zoom ?? 1
  if (!Number.isFinite(requestedZoom))
    throw new CoverCropError('INVALID_DIMENSIONS', 'Crop zoom is invalid.')
  const zoom = Math.min(maxZoom, Math.max(1, requestedZoom)),
    width = baseWidth / zoom,
    height = (width * COVER_ASPECT_HEIGHT) / COVER_ASPECT_WIDTH,
    horizontalRange = Math.max(0, sourceWidth - width),
    verticalRange = Math.max(0, sourceHeight - height),
    centerX = clampNormalized(options.centerX ?? 0.5),
    centerY = clampNormalized(options.centerY ?? 0.5),
    x = horizontalRange * centerX,
    y = verticalRange * centerY

  return {
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
    zoom,
    maxZoom,
  }
}

function clampNormalized(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

export function isCoverCropCurrent(
  crop: CoverCrop,
  sourceWidth: number,
  sourceHeight: number,
) {
  return (
    crop.sourceWidth === sourceWidth &&
    crop.sourceHeight === sourceHeight &&
    validDimension(sourceWidth) &&
    validDimension(sourceHeight) &&
    Number.isFinite(crop.x) &&
    Number.isFinite(crop.y) &&
    Number.isFinite(crop.width) &&
    Number.isFinite(crop.height) &&
    crop.width > 0 &&
    crop.height > 0 &&
    Math.abs(
      crop.width * COVER_ASPECT_HEIGHT - crop.height * COVER_ASPECT_WIDTH,
    ) <=
      Number.EPSILON * Math.max(crop.width, crop.height) * 32 &&
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.x + crop.width <= sourceWidth + 1e-7 &&
    crop.y + crop.height <= sourceHeight + 1e-7
  )
}
