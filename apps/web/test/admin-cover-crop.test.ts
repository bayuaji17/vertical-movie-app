import { test, expect } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  calculateCoverCrop,
  COVER_OUTPUT_HEIGHT,
  COVER_OUTPUT_WIDTH,
  isCoverCropCurrent,
} from '../src/lib/admin/cover-crop'
import {
  assertStaticCoverImage,
  decodeCoverImage,
  exportCoverCrop,
  MAX_COVER_SOURCE_PIXELS,
  CoverRasterScope,
} from '../src/lib/admin/cover-raster'
import { fingerprintFile } from '../src/lib/admin/file-fingerprint-core'
import {
  createCroppedCoverFile,
  MAX_CROPPED_COVER_BYTES,
} from '../src/lib/admin/media-file'
import type { CoverCanvas } from '../src/lib/admin/cover-raster'

const png = (animated = false) => {
  const chunk = (type: string, data = new Uint8Array()) => {
    const header = new Uint8Array(8),
      view = new DataView(header.buffer)
    view.setUint32(0, data.byteLength)
    for (let index = 0; index < 4; index++)
      header[4 + index] = type.charCodeAt(index)
    return new Uint8Array([...header, ...data, 0, 0, 0, 0])
  }
  return new Blob([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', new Uint8Array(13)),
    ...(animated ? [chunk('acTL', new Uint8Array(8))] : []),
    chunk('IDAT'),
    chunk('IEND'),
  ])
}

const webp = (animated = false) => {
  const chunk = (type: string, data: Uint8Array) => {
    const header = new Uint8Array(8),
      view = new DataView(header.buffer)
    for (let index = 0; index < 4; index++)
      header[index] = type.charCodeAt(index)
    view.setUint32(4, data.byteLength, true)
    return new Uint8Array([
      ...header,
      ...data,
      ...(data.byteLength % 2 ? [0] : []),
    ])
  }
  const chunks = [
    chunk('VP8X', new Uint8Array([animated ? 2 : 0, ...new Array(9).fill(0)])),
    ...(animated ? [chunk('ANIM', new Uint8Array(6))] : []),
  ]
  const payload = new Uint8Array(chunks.flatMap((part) => [...part])),
    header = new Uint8Array(12),
    view = new DataView(header.buffer)
  for (const [offset, value] of [
    [0, 'RIFF'],
    [8, 'WEBP'],
  ] as const)
    for (let index = 0; index < 4; index++)
      header[offset + index] = value.charCodeAt(index)
  view.setUint32(4, payload.byteLength + 4, true)
  return new Blob([header, payload])
}

const jpeg = () =>
  new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9, ...new Array(8).fill(0)])])

function fakeCanvas(onDraw?: (args: unknown[]) => void) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: (...args: unknown[]) => onDraw?.(args),
    }),
    toBlob: (callback: BlobCallback) =>
      callback(new Blob(['webp-output'], { type: 'image/webp' })),
  } as unknown as CoverCanvas
  return canvas
}

test('crop math covers portrait, landscape, square, pan bounds and maximum zoom', () => {
  for (const [width, height] of [
    [2160, 3840],
    [3840, 2160],
    [1920, 1920],
  ]) {
    const crop = calculateCoverCrop(width, height)
    expect(crop.width / crop.height).toBe(9 / 16)
    expect(crop.width).toBeGreaterThanOrEqual(COVER_OUTPUT_WIDTH)
    expect(crop.height).toBeGreaterThanOrEqual(COVER_OUTPUT_HEIGHT)
    expect(isCoverCropCurrent(crop, width, height)).toBe(true)
    const leftTop = calculateCoverCrop(width, height, {
        zoom: crop.maxZoom,
        centerX: 0,
        centerY: 0,
      }),
      rightBottom = calculateCoverCrop(width, height, {
        zoom: crop.maxZoom,
        centerX: 1,
        centerY: 1,
      })
    expect(leftTop.x).toBe(0)
    expect(leftTop.y).toBe(0)
    expect(rightBottom.x + rightBottom.width).toBeCloseTo(width, 8)
    expect(rightBottom.y + rightBottom.height).toBeCloseTo(height, 8)
    expect(isCoverCropCurrent(rightBottom, width, height)).toBe(true)
  }
  const zoomed = calculateCoverCrop(2160, 3840, {
    zoom: 1.5,
    centerY: 1,
  })
  expect(zoomed.zoom).toBe(1.5)
  expect(zoomed.y + zoomed.height).toBeCloseTo(3840, 8)
  expect(calculateCoverCrop(2160, 3840, { zoom: 99 }).zoom).toBeLessThan(2)
  expect(calculateCoverCrop(2160, 3840, { zoom: 99 }).zoom).toBeGreaterThan(
    1.99,
  )
  for (const [width, height] of [
    [1087, 1933],
    [4370, 7770],
    [3001, 5000],
  ]) {
    const edge = calculateCoverCrop(width, height, { zoom: 1e12 })
    expect(edge.width).toBeGreaterThanOrEqual(COVER_OUTPUT_WIDTH)
    expect(edge.height).toBeGreaterThanOrEqual(COVER_OUTPUT_HEIGHT)
    expect(edge.width / edge.height).toBeCloseTo(9 / 16, 12)
    expect(isCoverCropCurrent(edge, width, height)).toBe(true)
  }
})

test('crop math rejects images that require upscale and invalid dimensions', () => {
  expect(() => calculateCoverCrop(1079, 1920)).toThrow(
    expect.objectContaining({ code: 'SOURCE_TOO_SMALL' }),
  )
  expect(() => calculateCoverCrop(1080, 1919)).toThrow(
    expect.objectContaining({ code: 'SOURCE_TOO_SMALL' }),
  )
  for (const [width, height] of [
    [0, 1920],
    [Number.NaN, 1920],
    [1080, Number.POSITIVE_INFINITY],
  ])
    expect(() => calculateCoverCrop(width, height)).toThrow(
      expect.objectContaining({ code: 'INVALID_DIMENSIONS' }),
    )
  const valid = calculateCoverCrop(2160, 3840)
  expect(isCoverCropCurrent({ ...valid, width: 1079 }, 2160, 3840)).toBe(false)
  expect(isCoverCropCurrent(valid, 3840, 2160)).toBe(false)
})

test('static image inspection permits JPEG, PNG and still WebP but rejects animation', async () => {
  for (const file of [jpeg(), png(), webp()])
    await expect(assertStaticCoverImage(file)).resolves.toBeUndefined()
  await expect(assertStaticCoverImage(png(true))).rejects.toMatchObject({
    code: 'ANIMATED_INPUT',
  })
  await expect(assertStaticCoverImage(webp(true))).rejects.toMatchObject({
    code: 'ANIMATED_INPUT',
  })
  await expect(
    assertStaticCoverImage(new Blob(['GIF89a', ...new Array(10).fill(0)])),
  ).rejects.toMatchObject({ code: 'INPUT_UNSUPPORTED' })
})

test('decode applies EXIF orientation and closes a bitmap completed after abort', async () => {
  let seen: ImageBitmapOptions | undefined,
    closeCount = 0
  const bitmap = {
    width: 400,
    height: 600,
    close: () => closeCount++,
  } as ImageBitmap
  const decoded = await decodeCoverImage(jpeg(), {
    createBitmap: async (_file, options) => {
      seen = options
      return bitmap
    },
  })
  expect(decoded).toBe(bitmap)
  expect(seen?.imageOrientation).toBe('from-image')

  const controller = new AbortController()
  let release!: (bitmap: ImageBitmap) => void
  let markStarted!: () => void
  const started = new Promise<void>((resolve) => (markStarted = resolve))
  const pending = decodeCoverImage(jpeg(), {
    signal: controller.signal,
    createBitmap: () => {
      markStarted()
      return new Promise((resolve) => (release = resolve))
    },
  })
  await started
  controller.abort()
  const lateBitmap = {
    width: 1200,
    height: 2400,
    close: () => closeCount++,
  } as ImageBitmap
  await expect(pending).rejects.toHaveProperty('name', 'AbortError')
  release(lateBitmap)
  await Promise.resolve()
  expect(closeCount).toBe(1)
})

test('decode closes an oversized bitmap before returning it', async () => {
  let closed = 0
  const pending = decodeCoverImage(jpeg(), {
    createBitmap: async () => ({
      width: Math.ceil(Math.sqrt(MAX_COVER_SOURCE_PIXELS + 1)),
      height: Math.ceil(Math.sqrt(MAX_COVER_SOURCE_PIXELS + 1)),
      close: () => closed++,
    }),
  })
  await expect(pending).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' })
  expect(closed).toBe(1)
})

test('owner-scoped raster work aborts replacements and disposes decoded buffers', async () => {
  const scope = new CoverRasterScope()
  let closed = 0
  const firstAttempt = scope.begin(),
    first = {
      width: 1200,
      height: 2400,
      close: () => closed++,
    } as ImageBitmap
  await scope.decode(jpeg(), firstAttempt, {
    createBitmap: async () => first,
  })
  const secondAttempt = scope.begin()
  expect(firstAttempt.signal.aborted).toBe(true)
  expect(firstAttempt.isCurrent()).toBe(false)
  expect(closed).toBe(1)
  const second = {
    width: 1200,
    height: 2400,
    close: () => closed++,
  } as ImageBitmap
  await scope.decode(jpeg(), secondAttempt, {
    createBitmap: async () => second,
  })
  scope.dispose()
  expect(secondAttempt.signal.aborted).toBe(true)
  expect(secondAttempt.isCurrent()).toBe(false)
  expect(closed).toBe(2)

  const lateAttempt = scope.begin()
  let release!: (bitmap: ImageBitmap) => void, markStarted!: () => void
  const started = new Promise<void>((resolve) => (markStarted = resolve)),
    pending = scope.decode(jpeg(), lateAttempt, {
      createBitmap: () => {
        markStarted()
        return new Promise((resolve) => (release = resolve))
      },
    })
  await started
  scope.dispose()
  await expect(pending).rejects.toHaveProperty('name', 'AbortError')
  release({ width: 1200, height: 2400, close: () => closed++ })
  await Promise.resolve()
  expect(closed).toBe(3)
})

test('raster export uses exact 1080×1920 pixels and returns the encoded bytes as its File', async () => {
  const image = { width: 2160, height: 3840 } as ImageBitmap,
    crop = calculateCoverCrop(image.width, image.height, { zoom: 1.5 }),
    drawCalls: unknown[][] = [],
    canvas = fakeCanvas((args) => drawCalls.push(args))
  const file = await exportCoverCrop(image, 'original.jpeg', crop, {
    createCanvas: () => canvas,
  })
  expect(canvas.width).toBe(0)
  expect(canvas.height).toBe(0)
  expect(drawCalls).toHaveLength(1)
  expect(drawCalls[0]).toHaveLength(9)
  expect(drawCalls[0]?.slice(-4)).toEqual([
    0,
    0,
    COVER_OUTPUT_WIDTH,
    COVER_OUTPUT_HEIGHT,
  ])
  expect(file.name).toBe('original.webp')
  expect(file.type).toBe('image/webp')
  const bytes = new Uint8Array(await file.arrayBuffer()),
    expected = createHash('sha256').update(bytes).digest('hex')
  expect(await fingerprintFile(file)).toBe(expected)
  expect(new TextDecoder().decode(bytes)).toBe('webp-output')
  expect(file.size).toBeGreaterThan(0)
})

test('Canvas MIME fallback controls output extension, type and upload validation', async () => {
  const image = { width: 2160, height: 3840 } as ImageBitmap,
    crop = calculateCoverCrop(image.width, image.height),
    canvas = fakeCanvas()
  const file = await exportCoverCrop(image, 'cover.webp', crop, {
    createCanvas: () => canvas,
    encode: async () => new Blob(['png-output'], { type: 'image/png' }),
  })
  expect(file.name).toBe('cover.png')
  expect(file.type).toBe('image/png')
  expect(file.size).toBe(new Blob(['png-output']).size)
  const expectedSha = createHash('sha256')
    .update(new Uint8Array(await file.arrayBuffer()))
    .digest('hex')
  expect(expectedSha).toMatch(/^[a-f0-9]{64}$/)
  expect(await fingerprintFile(file)).toBe(expectedSha)
  const accepted = createCroppedCoverFile('cover.jpg', file, 100)
  expect(accepted.name).toBe('cover.png')
  expect(accepted.type).toBe('image/png')
  expect(() => createCroppedCoverFile('cover.jpg', file, 1)).toThrow(
    expect.objectContaining({ code: 'FILE_TOO_LARGE' }),
  )
  expect(() =>
    createCroppedCoverFile(
      'cover.jpg',
      new Blob(['gif'], { type: 'image/gif' }),
    ),
  ).toThrow(expect.objectContaining({ code: 'FILE_UNSUPPORTED' }))
  expect(MAX_CROPPED_COVER_BYTES).toBe(5_000_000)
})

test('oversized output is rejected and the canvas backing store is released', async () => {
  const canvas = fakeCanvas(),
    bitmap = { width: 2160, height: 3840 } as ImageBitmap,
    crop = calculateCoverCrop(bitmap.width, bitmap.height)
  await expect(
    exportCoverCrop(bitmap, 'cover.png', crop, {
      maxBytes: 4,
      createCanvas: () => canvas,
      encode: async () =>
        new Blob(['more than four bytes'], { type: 'image/webp' }),
    }),
  ).rejects.toMatchObject({ code: 'CROP_OUTPUT_TOO_LARGE' })
  expect(canvas.width).toBe(0)
  expect(canvas.height).toBe(0)
})

test('late Canvas callbacks after abort or owner change cannot return a stale File', async () => {
  const image = { width: 2160, height: 3840 } as ImageBitmap,
    crop = calculateCoverCrop(image.width, image.height)
  for (const staleReason of ['abort', 'owner'] as const) {
    const canvas = fakeCanvas(),
      controller = new AbortController()
    let release!: (blob: Blob) => void,
      current = true
    const pending = exportCoverCrop(image, 'cover.png', crop, {
      signal: controller.signal,
      isCurrent: () => current,
      createCanvas: () => canvas,
      encode: () => new Promise((resolve) => (release = resolve)),
    })
    await Promise.resolve()
    if (staleReason === 'abort') {
      controller.abort()
      await expect(pending).rejects.toHaveProperty('name', 'AbortError')
      expect(canvas.width).toBe(0)
      expect(canvas.height).toBe(0)
      release(new Blob(['late'], { type: 'image/webp' }))
    } else {
      current = false
      release(new Blob(['late'], { type: 'image/webp' }))
      await expect(pending).rejects.toHaveProperty('name', 'AbortError')
    }
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  }
})

test('a crop cannot be exported against dimensions from a previous owner or image', async () => {
  const image = { width: 2160, height: 3840 } as ImageBitmap,
    previous = calculateCoverCrop(2160, 3840)
  await expect(
    exportCoverCrop(
      image,
      'cover.jpg',
      { ...previous, sourceWidth: 1920 },
      {
        createCanvas: () => fakeCanvas(),
      },
    ),
  ).rejects.toMatchObject({ code: 'CROP_STALE' })
})

test('the browser upload descriptor accepts only the real cropped filename and MIME pair', () => {
  const file = createCroppedCoverFile(
    '../unsafe\u0000cover.gif',
    new Blob(['bytes'], { type: 'image/webp' }),
  )
  expect(file.name).toBe('unsafe_cover.webp')
  expect(file.type).toBe('image/webp')
  expect(() => createCroppedCoverFile('cover.jpg', new Blob(['x']))).toThrow(
    expect.objectContaining({ code: 'FILE_UNSUPPORTED' }),
  )
})
