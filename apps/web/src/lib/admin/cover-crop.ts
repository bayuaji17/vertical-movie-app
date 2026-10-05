export const COVER_ASPECT_WIDTH = 9
export const COVER_ASPECT_HEIGHT = 16
export const COVER_OUTPUT_WIDTH = 1080
export const COVER_OUTPUT_HEIGHT = 1920

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
    readonly code: 'INVALID_DIMENSIONS' | 'SOURCE_TOO_SMALL',
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
    ),
    baseHeight = (baseWidth * COVER_ASPECT_HEIGHT) / COVER_ASPECT_WIDTH,
    availableZoom = Math.min(
      baseWidth / COVER_OUTPUT_WIDTH,
      baseHeight / COVER_OUTPUT_HEIGHT,
    )

  if (availableZoom < 1 - Number.EPSILON * 16)
    throw new CoverCropError(
      'SOURCE_TOO_SMALL',
      'Choose an image with at least 1080 × 1920 pixels in the selected crop.',
    )

  // Keep a tiny pixel margin below the theoretical limit. IEEE-754 division can
  // otherwise turn a valid 1080 × 1920 edge crop into a sub-pixel upscale.
  const maxZoom =
    availableZoom <= 1 ? 1 : Math.max(1, availableZoom * (1 - 1e-9))

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
    Number.isFinite(crop.x) &&
    Number.isFinite(crop.y) &&
    Number.isFinite(crop.width) &&
    Number.isFinite(crop.height) &&
    crop.width >= COVER_OUTPUT_WIDTH &&
    crop.height >= COVER_OUTPUT_HEIGHT &&
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
