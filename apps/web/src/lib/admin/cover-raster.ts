import {
  COVER_OUTPUT_HEIGHT,
  COVER_OUTPUT_WIDTH,
  isCoverCropCurrent,
} from './cover-crop'
import type { CoverCrop } from './cover-crop'
import { createCroppedCoverFile, MAX_CROPPED_COVER_BYTES } from './media-file'

export const MAX_COVER_SOURCE_PIXELS = 40_000_000
export const DEFAULT_MAX_COVER_BYTES = MAX_CROPPED_COVER_BYTES
export const COVER_WEBP_QUALITY = 0.95
const MAX_IMAGE_CHUNKS = 10_000

export type CoverRasterErrorCode =
  | 'INPUT_UNSUPPORTED'
  | 'ANIMATED_INPUT'
  | 'IMAGE_DECODE_FAILED'
  | 'IMAGE_TOO_LARGE'
  | 'CROP_STALE'
  | 'CROP_ENCODE_FAILED'
  | 'CROP_OUTPUT_TOO_LARGE'

export class CoverRasterError extends Error {
  constructor(
    readonly code: CoverRasterErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'CoverRasterError'
  }
}

export type CoverRasterOperation = {
  signal?: AbortSignal
  /** False after the owning content or crop attempt changes. */
  isCurrent?: () => boolean
}

export type CoverCanvas = Pick<
  HTMLCanvasElement,
  'width' | 'height' | 'getContext' | 'toBlob'
>

export type CoverBitmapFactory = (
  source: Blob,
  options: ImageBitmapOptions,
) => Promise<ImageBitmap>

export type CoverCanvasFactory = () => CoverCanvas

export type CoverCanvasEncoder = (
  canvas: CoverCanvas,
  type: string,
  quality: number,
) => Promise<Blob | null>

function throwIfStale(operation: CoverRasterOperation) {
  operation.signal?.throwIfAborted()
  if (operation.isCurrent && !operation.isCurrent())
    throw new DOMException('Cover crop is no longer current.', 'AbortError')
}

function awaitAbortable<T>(
  pending: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return pending
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abort),
      abort = () => {
        cleanup()
        reject(signal.reason)
      }
    signal.addEventListener('abort', abort, { once: true })
    pending.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error) => {
        cleanup()
        reject(error)
      },
    )
  })
}

async function readAt(file: Blob, offset: number, length: number) {
  if (offset < 0 || length < 1 || offset + length > file.size)
    throw new CoverRasterError(
      'IMAGE_DECODE_FAILED',
      'This image file is incomplete or invalid.',
    )
  const bytes = new Uint8Array(
    await file.slice(offset, offset + length).arrayBuffer(),
  )
  if (bytes.byteLength !== length)
    throw new CoverRasterError(
      'IMAGE_DECODE_FAILED',
      'This image file is incomplete or invalid.',
    )
  return bytes
}

/** Reject animation before the browser silently decodes only its first frame. */
export async function assertStaticCoverImage(
  file: Blob,
  operation: CoverRasterOperation = {},
) {
  throwIfStale(operation)
  if (!Number.isSafeInteger(file.size) || file.size < 12)
    throw new CoverRasterError(
      'IMAGE_DECODE_FAILED',
      'This image file is incomplete or invalid.',
    )

  const signature = await readAt(file, 0, 12)
  throwIfStale(operation)
  const text = (bytes: Uint8Array, offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length))

  if (
    signature[0] === 0x89 &&
    text(signature, 1, 3) === 'PNG' &&
    signature[4] === 0x0d &&
    signature[5] === 0x0a &&
    signature[6] === 0x1a &&
    signature[7] === 0x0a
  ) {
    let offset = 8
    for (let index = 0; index < MAX_IMAGE_CHUNKS; index++) {
      throwIfStale(operation)
      const header = await readAt(file, offset, 8),
        length = new DataView(header.buffer).getUint32(0),
        type = text(header, 4, 4)
      if (type === 'acTL')
        throw new CoverRasterError(
          'ANIMATED_INPUT',
          'Animated images are not supported. Choose a still image.',
        )
      if (length > file.size - offset - 12)
        throw new CoverRasterError(
          'IMAGE_DECODE_FAILED',
          'This image file is incomplete or invalid.',
        )
      if (type === 'IDAT') return
      offset += length + 12
    }
    throw new CoverRasterError(
      'IMAGE_DECODE_FAILED',
      'This image file has too many chunks to inspect safely.',
    )
  }

  if (text(signature, 0, 4) === 'RIFF' && text(signature, 8, 4) === 'WEBP') {
    const riffEnd = new DataView(signature.buffer).getUint32(4, true) + 8
    if (riffEnd > file.size || riffEnd < 12)
      throw new CoverRasterError(
        'IMAGE_DECODE_FAILED',
        'This image file is incomplete or invalid.',
      )
    let offset = 12
    for (
      let index = 0;
      offset + 8 <= riffEnd && index < MAX_IMAGE_CHUNKS;
      index++
    ) {
      throwIfStale(operation)
      const header = await readAt(file, offset, 8),
        type = text(header, 0, 4),
        length = new DataView(header.buffer).getUint32(4, true)
      if (type === 'ANIM' || type === 'ANMF')
        throw new CoverRasterError(
          'ANIMATED_INPUT',
          'Animated images are not supported. Choose a still image.',
        )
      if (type === 'VP8X') {
        const flags = (await readAt(file, offset + 8, 1))[0]
        if (flags & 0x02)
          throw new CoverRasterError(
            'ANIMATED_INPUT',
            'Animated images are not supported. Choose a still image.',
          )
      }
      if (length > riffEnd - offset - 8)
        throw new CoverRasterError(
          'IMAGE_DECODE_FAILED',
          'This image file is incomplete or invalid.',
        )
      offset += 8 + length + (length % 2)
    }
    if (offset < riffEnd)
      throw new CoverRasterError(
        'IMAGE_DECODE_FAILED',
        'This image file has too many chunks to inspect safely.',
      )
    return
  }

  if (signature[0] === 0xff && signature[1] === 0xd8) return

  throw new CoverRasterError(
    'INPUT_UNSUPPORTED',
    'Choose a still JPEG, PNG, or WebP image.',
  )
}

/** Decode with EXIF orientation applied. A late decode closes its bitmap. */
export async function decodeCoverImage(
  file: Blob,
  options: CoverRasterOperation & {
    createBitmap?: CoverBitmapFactory
  } = {},
) {
  await assertStaticCoverImage(file, options)
  throwIfStale(options)
  let bitmap: ImageBitmap
  const decoding = (options.createBitmap ?? createImageBitmap)(file, {
    imageOrientation: 'from-image',
  })
  try {
    bitmap = await awaitAbortable(decoding, options.signal)
  } catch {
    if (options.signal?.aborted)
      void decoding.then(
        (lateBitmap) => lateBitmap.close(),
        () => {},
      )
    throwIfStale(options)
    throw new CoverRasterError(
      'IMAGE_DECODE_FAILED',
      'The image could not be opened. Choose another image file.',
    )
  }

  try {
    throwIfStale(options)
    if (
      !Number.isSafeInteger(bitmap.width) ||
      !Number.isSafeInteger(bitmap.height) ||
      bitmap.width < 1 ||
      bitmap.height < 1
    )
      throw new CoverRasterError(
        'IMAGE_DECODE_FAILED',
        'This image has invalid dimensions.',
      )
    if (bitmap.width * bitmap.height > MAX_COVER_SOURCE_PIXELS)
      throw new CoverRasterError(
        'IMAGE_TOO_LARGE',
        'This image has too many pixels to crop safely in your browser.',
      )
    return bitmap
  } catch (error) {
    bitmap.close()
    throw error
  }
}

function defaultCanvasFactory(): CoverCanvas {
  if (typeof document === 'undefined')
    throw new CoverRasterError(
      'CROP_ENCODE_FAILED',
      'Cover cropping is unavailable in this browser.',
    )
  return document.createElement('canvas')
}

function defaultEncoder(canvas: CoverCanvas, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}

/** Render only the selected source rectangle and return a MIME-matched File. */
export async function exportCoverCrop(
  bitmap: ImageBitmap,
  originalFilename: string,
  crop: CoverCrop,
  options: CoverRasterOperation & {
    maxBytes?: number
    createCanvas?: CoverCanvasFactory
    encode?: CoverCanvasEncoder
  } = {},
) {
  throwIfStale(options)
  if (!isCoverCropCurrent(crop, bitmap.width, bitmap.height))
    throw new CoverRasterError(
      'CROP_STALE',
      'The image changed while the crop was being prepared. Try again.',
    )

  const canvas = (options.createCanvas ?? defaultCanvasFactory)()
  try {
    canvas.width = COVER_OUTPUT_WIDTH
    canvas.height = COVER_OUTPUT_HEIGHT
    const context = canvas.getContext('2d')
    if (!context)
      throw new CoverRasterError(
        'CROP_ENCODE_FAILED',
        'Cover cropping is unavailable in this browser.',
      )
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
      COVER_OUTPUT_WIDTH,
      COVER_OUTPUT_HEIGHT,
    )
    throwIfStale(options)
    let blob: Blob | null
    try {
      blob = await awaitAbortable(
        (options.encode ?? defaultEncoder)(
          canvas,
          'image/webp',
          COVER_WEBP_QUALITY,
        ),
        options.signal,
      )
    } catch (error) {
      throwIfStale(options)
      if (error instanceof CoverRasterError) throw error
      throw new CoverRasterError(
        'CROP_ENCODE_FAILED',
        'The cropped image could not be saved. Try again.',
      )
    }
    throwIfStale(options)
    if (!blob || blob.size < 1)
      throw new CoverRasterError(
        'CROP_ENCODE_FAILED',
        'The cropped image could not be saved. Try again.',
      )
    if (blob.type !== 'image/webp' && blob.type !== 'image/png')
      throw new CoverRasterError(
        'CROP_ENCODE_FAILED',
        'This browser did not return a supported cover image format.',
      )
    if (blob.size > (options.maxBytes ?? DEFAULT_MAX_COVER_BYTES))
      throw new CoverRasterError(
        'CROP_OUTPUT_TOO_LARGE',
        'The cropped cover is larger than the allowed file size.',
      )
    return createCroppedCoverFile(originalFilename, blob)
  } finally {
    // Releases the browser's pixel backing store, including after late callbacks.
    canvas.width = 0
    canvas.height = 0
  }
}

export type CoverRasterAttempt = {
  signal: AbortSignal
  isCurrent: () => boolean
}

/** Owner-scoped bitmap, decode, and encode lifecycle for the crop dialog. */
export class CoverRasterScope {
  private generation = 0
  private controller?: AbortController
  private bitmap?: ImageBitmap

  begin(): CoverRasterAttempt {
    this.controller?.abort()
    this.bitmap?.close()
    this.bitmap = undefined
    const controller = new AbortController(),
      generation = ++this.generation
    this.controller = controller
    const isCurrent = () =>
      this.generation === generation && !controller.signal.aborted
    return { signal: controller.signal, isCurrent }
  }

  async decode(
    file: Blob,
    attempt: CoverRasterAttempt,
    options: { createBitmap?: CoverBitmapFactory } = {},
  ) {
    if (!attempt.isCurrent())
      throw new DOMException('Cover crop is no longer current.', 'AbortError')
    const bitmap = await decodeCoverImage(file, { ...options, ...attempt })
    if (!attempt.isCurrent()) {
      bitmap.close()
      throw new DOMException('Cover crop is no longer current.', 'AbortError')
    }
    this.bitmap = bitmap
    return bitmap
  }

  export(
    filename: string,
    crop: CoverCrop,
    attempt: CoverRasterAttempt,
    options: Pick<
      NonNullable<Parameters<typeof exportCoverCrop>[3]>,
      'maxBytes' | 'createCanvas' | 'encode'
    > = {},
  ) {
    if (!attempt.isCurrent() || !this.bitmap)
      throw new DOMException('Cover crop is no longer current.', 'AbortError')
    return exportCoverCrop(this.bitmap, filename, crop, {
      ...options,
      signal: attempt.signal,
      isCurrent: attempt.isCurrent,
    })
  }

  dispose() {
    this.generation++
    this.controller?.abort()
    this.controller = undefined
    this.bitmap?.close()
    this.bitmap = undefined
  }
}
