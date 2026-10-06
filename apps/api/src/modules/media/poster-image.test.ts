import { inflateSync } from "node:zlib";
import { expect, test } from "bun:test";

const fixtureRoot = new URL("../../../test/fixtures/media/", import.meta.url);
const maxPixels = 16_777_216;
const maxUploadBytes = 5_000_000;

const readFixture = async (name: string) =>
  Buffer.from(await Bun.file(new URL(name, fixtureRoot)).arrayBuffer());

const pngChunk = (type: string, data: Buffer) => {
  const name = Buffer.from(type);
  const body = Buffer.concat([name, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1)
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  return current >>> 0;
});

const crc32 = (bytes: Buffer) => {
  let current = 0xffffffff;
  for (const byte of bytes)
    current = crcTable[(current ^ byte) & 0xff] ^ (current >>> 8);
  return (current ^ 0xffffffff) >>> 0;
};

const pngHeader = (width: number, height: number) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};

const paeth = (left: number, up: number, upperLeft: number) => {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance)
    return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
};

const rgbaPixel = (png: Buffer, targetX: number, targetY: number) => {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const bitDepth = png[24];
  const colorType = png[25];
  if (bitDepth !== 8 || colorType !== 6)
    throw new Error(
      `Expected RGBA8 PNG, received bitDepth=${bitDepth}, type=${colorType}`,
    );

  const imageData: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT")
      imageData.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
    if (type === "IEND") break;
  }

  const decoded = inflateSync(Buffer.concat(imageData));
  const stride = width * 4;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y <= targetY && y < height; y += 1) {
    const inputOffset = y * (stride + 1);
    const filter = decoded[inputOffset];
    const current = Buffer.alloc(stride);
    for (let index = 0; index < stride; index += 1) {
      const raw = decoded[inputOffset + index + 1];
      const left = index >= 4 ? current[index - 4] : 0;
      const up = previous[index];
      const upperLeft = index >= 4 ? previous[index - 4] : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? Math.floor((left + up) / 2)
                : filter === 4
                  ? paeth(left, up, upperLeft)
                  : undefined;
      if (predictor === undefined)
        throw new Error(`Unknown PNG filter ${filter}`);
      current[index] = (raw + predictor) & 0xff;
    }
    if (y === targetY)
      return [...current.subarray(targetX * 4, targetX * 4 + 4)];
    previous = current;
  }
  throw new Error("PNG pixel is outside the image");
};

const exifOrientation = (jpeg: Buffer, orientation: number) => {
  const tiff = Buffer.from([
    0x45,
    0x78,
    0x69,
    0x66,
    0,
    0,
    0x49,
    0x49,
    0x2a,
    0,
    0x08,
    0,
    0,
    0,
    0x01,
    0,
    0x12,
    0x01,
    0x03,
    0,
    0x01,
    0,
    0,
    0,
    orientation,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
  const segmentLength = tiff.length + 2;
  const segment = Buffer.from([
    0xff,
    0xe1,
    segmentLength >>> 8,
    segmentLength & 0xff,
  ]);
  return Buffer.concat([jpeg.subarray(0, 2), segment, tiff, jpeg.subarray(2)]);
};

test("Bun.Image accepts browser crop formats and writes a bounded 1080×1920 WebP", async () => {
  for (const name of ["browser-cover-crop.png", "browser-cover-crop.webp"]) {
    const source = await readFixture(name);
    expect(source.byteLength).toBeLessThanOrEqual(maxUploadBytes);
    expect(
      await new Bun.Image(source, { maxPixels, autoOrient: true }).metadata(),
    ).toEqual({
      width: 1080,
      height: 1920,
      format: name.endsWith(".png") ? "png" : "webp",
    });

    const output = await new Bun.Image(source, { maxPixels, autoOrient: true })
      .webp({ quality: 85 })
      .bytes();
    expect(output.byteLength).toBeLessThan(maxUploadBytes);
    expect(await new Bun.Image(output, { maxPixels }).metadata()).toEqual({
      width: 1080,
      height: 1920,
      format: "webp",
    });
  }
});

test("native WebP output keeps transparent crop pixels", async () => {
  const source = await readFixture("browser-cover-crop.webp");
  const webp = await new Bun.Image(source, { maxPixels })
    .webp({ quality: 85 })
    .bytes();
  const decodedPng = await new Bun.Image(webp, { maxPixels }).png().bytes();
  expect(rgbaPixel(Buffer.from(decodedPng), 540, 3)[3]).toBe(0);
});

test("Bun.Image sniffs bytes instead of trusting the File type or extension", async () => {
  const png = await readFixture("browser-cover-crop.png");
  const mislabeled = new File([png], "cover.webp", { type: "image/webp" });

  expect(await new Bun.Image(mislabeled).metadata()).toEqual({
    width: 1080,
    height: 1920,
    format: "png",
  });
});

test("Bun.Image auto-orients JPEG before its output dimensions are set", async () => {
  const png = await readFixture("browser-cover-crop.png");
  const jpeg = await new Bun.Image(png).jpeg({ quality: 90 }).bytes();
  const oriented = exifOrientation(Buffer.from(jpeg), 6);

  expect(await new Bun.Image(oriented, { maxPixels }).metadata()).toEqual({
    width: 1920,
    height: 1080,
    format: "jpeg",
  });
});

test("pixel budget rejects oversized image headers before pixel allocation", async () => {
  const oversizedHeader = pngHeader(4097, 4096);
  const image = new Bun.Image(oversizedHeader, { maxPixels });

  await expect(image.metadata()).rejects.toMatchObject({
    code: "ERR_IMAGE_TOO_MANY_PIXELS",
  });
});

test("aborting an HTTP signal cannot cancel an already scheduled image terminal", async () => {
  const source = await readFixture("browser-cover-crop.webp");
  const controller = new AbortController();
  const terminal = new Bun.Image(source, { maxPixels })
    .webp({ quality: 85 })
    .bytes();

  controller.abort();
  expect(controller.signal.aborted).toBe(true);
  expect((await terminal).byteLength).toBeGreaterThan(0);
});

test("truncated JPEG data fails the awaited native decode", async () => {
  const png = await readFixture("browser-cover-crop.png");
  const jpeg = Buffer.from(
    await new Bun.Image(png).jpeg({ quality: 90 }).bytes(),
  );
  const truncated = jpeg.subarray(0, jpeg.length - 2);

  await expect(new Bun.Image(truncated).png().bytes()).rejects.toMatchObject({
    code: "ERR_IMAGE_DECODE_FAILED",
  });
});

test("animated PNG and GIF metadata report a still format without frame counts", async () => {
  const apng = await readFixture("two-frame-apng.png");
  const gif = await readFixture("two-frame.gif");
  const apngMetadata = await new Bun.Image(apng).metadata();
  const gifMetadata = await new Bun.Image(gif).metadata();

  expect(apngMetadata).toEqual({ width: 16, height: 16, format: "png" });
  expect(gifMetadata).toEqual({ width: 16, height: 16, format: "gif" });
  expect(apng.includes(Buffer.from("acTL"))).toBe(true);
  expect(Object.keys(apngMetadata)).not.toContain("frames");
  expect(Object.keys(gifMetadata)).not.toContain("frames");
  const apngStill = await new Bun.Image(apng).png().bytes();
  const gifStill = await new Bun.Image(gif).png().bytes();
  expect(await new Bun.Image(apngStill).metadata()).toEqual({
    width: 16,
    height: 16,
    format: "png",
  });
  expect(await new Bun.Image(gifStill).metadata()).toEqual({
    width: 16,
    height: 16,
    format: "png",
  });
});
