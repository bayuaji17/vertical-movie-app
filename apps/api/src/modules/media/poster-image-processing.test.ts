import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { afterEach, describe, expect, it } from "bun:test";
import { loadPosterEnv } from "../../config/poster-env";
import {
  POSTER_HEIGHT,
  POSTER_WIDTH,
  PosterImageProcessor,
  type PosterImageRuntime,
} from "./poster-image";

const fixtureRoot = new URL("../../../test/fixtures/media/", import.meta.url);
const readFixture = async (name: string) =>
  Buffer.from(await Bun.file(new URL(name, fixtureRoot)).arrayBuffer());
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const shortWait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function pngAlphaAt(png: Buffer, targetX: number, targetY: number) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 6)
    throw new Error("Expected an RGBA8 PNG for the alpha proof.");

  const compressed: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT")
      compressed.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
    if (type === "IEND") break;
  }

  const decoded = inflateSync(Buffer.concat(compressed));
  const stride = width * 4;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y <= targetY && y < height; y += 1) {
    const inputOffset = y * (stride + 1);
    const filter = decoded[inputOffset];
    const current = Buffer.alloc(stride);
    for (let index = 0; index < stride; index += 1) {
      const raw = decoded[inputOffset + index + 1];
      const left = index >= 4 ? current[index - 4]! : 0;
      const up = previous[index]!;
      const upperLeft = index >= 4 ? previous[index - 4]! : 0;
      const estimate = left + up - upperLeft;
      const leftDistance = Math.abs(estimate - left);
      const upDistance = Math.abs(estimate - up);
      const upperLeftDistance = Math.abs(estimate - upperLeft);
      const paeth =
        leftDistance <= upDistance && leftDistance <= upperLeftDistance
          ? left
          : upDistance <= upperLeftDistance
            ? up
            : upperLeft;
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
                  ? paeth
                  : undefined;
      if (predictor === undefined) throw new Error("Unknown PNG filter.");
      current[index] = (raw! + predictor) & 0xff;
    }
    if (y === targetY) return current[targetX * 4 + 3];
    previous = current;
  }
  throw new Error("Pixel is outside the decoded PNG.");
}

function animatedWebp() {
  const vp8x = Buffer.alloc(10);
  vp8x[0] = 0x02;
  const chunk = Buffer.concat([
    Buffer.from("VP8X"),
    Buffer.from([10, 0, 0, 0]),
    vp8x,
  ]);
  const header = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.alloc(4),
    Buffer.from("WEBP"),
  ]);
  const bytes = Buffer.concat([header, chunk]);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  return bytes;
}

function controlledRuntime(
  sourceFormat: string,
  output: Uint8Array,
  metadata: () => Promise<void>,
  sourceDimensions = { width: POSTER_WIDTH, height: POSTER_HEIGHT },
): PosterImageRuntime {
  let imageNumber = 0;
  const pipeline = (
    isOutput: boolean,
  ): ReturnType<PosterImageRuntime["createImage"]> => {
    const image: ReturnType<PosterImageRuntime["createImage"]> = {
      metadata: async () => {
        if (!isOutput) await metadata();
        return isOutput
          ? { width: POSTER_WIDTH, height: POSTER_HEIGHT, format: "webp" }
          : { ...sourceDimensions, format: sourceFormat };
      },
      resize: (width, height, options) => {
        expect([width, height, options]).toEqual([
          POSTER_WIDTH,
          POSTER_HEIGHT,
          { fit: "inside", withoutEnlargement: true },
        ]);
        return image;
      },
      webp: (options) => {
        expect(options).toEqual({ quality: 85 });
        return image;
      },
      bytes: async () => output,
    };
    return image;
  };

  return {
    createImage: (_bytes, options) => {
      expect(options).toEqual({ maxPixels: 16_777_216, autoOrient: true });
      return pipeline(imageNumber++ > 0);
    },
  };
}

describe("PosterImageProcessor", () => {
  const processors: PosterImageProcessor[] = [];
  afterEach(() => {
    expect(processors.every((processor) => processor.activeCount === 0)).toBe(
      true,
    );
    processors.length = 0;
  });

  it("normalizes supported static inputs to verified WebP with their exact fingerprint", async () => {
    for (const [name, contentType] of [
      ["browser-cover-crop.png", "image/png"],
      ["browser-cover-crop.webp", "image/webp"],
    ] as const) {
      const bytes = await readFixture(name);
      const processor = new PosterImageProcessor(loadPosterEnv({}));
      processors.push(processor);

      const result = await processor.process({
        bytes,
        contentType,
        sha256: hash(bytes),
      });

      expect(result).toMatchObject({
        contentType: "image/webp",
        sha256: hash(result.bytes),
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
      });
      expect(
        await new Bun.Image(result.bytes, { maxPixels: 16_777_216 }).metadata(),
      ).toEqual({ width: POSTER_WIDTH, height: POSTER_HEIGHT, format: "webp" });
    }
  });

  it("rejects byte, type, hash, animation, and malformed-container violations safely", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const animatedPng = await readFixture("two-frame-apng.png");
    const processor = new PosterImageProcessor(loadPosterEnv({}));
    processors.push(processor);
    const image = (
      bytes: Uint8Array,
      contentType = "image/png",
      sha256 = hash(bytes),
    ) => processor.process({ bytes, contentType, sha256 });

    await expect(image(png, "image/webp")).rejects.toMatchObject({
      code: "POSTER_INVALID_IMAGE",
    });
    await expect(image(png, "image/jpeg")).rejects.toMatchObject({
      code: "POSTER_INVALID_TYPE",
    });
    await expect(image(png, "image/png", "0".repeat(64))).rejects.toMatchObject(
      {
        code: "POSTER_HASH_MISMATCH",
      },
    );
    await expect(image(animatedPng)).rejects.toMatchObject({
      code: "POSTER_ANIMATED_IMAGE",
    });
    const webp = animatedWebp();
    await expect(image(webp, "image/webp")).rejects.toMatchObject({
      code: "POSTER_ANIMATED_IMAGE",
    });
    await expect(
      image(Buffer.alloc(5_000_001), "image/png"),
    ).rejects.toMatchObject({
      code: "POSTER_SOURCE_TOO_LARGE",
    });
    await expect(image(Buffer.from("bad"))).rejects.toMatchObject({
      code: "POSTER_INVALID_IMAGE",
    });
  });

  it("maps native decoder failures to a safe domain error", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const output = await new Bun.Image(png).webp({ quality: 85 }).bytes();
    const runtime = controlledRuntime("png", output, async () => {});
    const failingRuntime: PosterImageRuntime = {
      createImage: (bytes, options) => {
        const image = runtime.createImage(bytes, options);
        return {
          ...image,
          metadata: async () => {
            throw new Error("sensitive decoder detail");
          },
        };
      },
    };
    const processor = new PosterImageProcessor(
      loadPosterEnv({}),
      failingRuntime,
    );
    processors.push(processor);

    await expect(
      processor.process({
        bytes: png,
        contentType: "image/png",
        sha256: hash(png),
      }),
    ).rejects.toMatchObject({
      name: "PosterImageProcessingError",
      code: "POSTER_INVALID_IMAGE",
      message: "The uploaded cover image is invalid or unsupported.",
    });
  });

  it("rejects malformed or unverified encoder output before returning it", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const processor = new PosterImageProcessor(
      loadPosterEnv({}),
      controlledRuntime("png", Buffer.from("not webp"), async () => {}),
    );
    processors.push(processor);

    await expect(
      processor.process({
        bytes: png,
        contentType: "image/png",
        sha256: hash(png),
      }),
    ).rejects.toMatchObject({
      code: "POSTER_INVALID_OUTPUT",
      message: "The processed cover could not be verified.",
    });
  });

  it("enforces 9:16 geometry and minimum dimensions after orientation", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const output = await new Bun.Image(png).webp({ quality: 85 }).bytes();
    const cases = [
      [{ width: 1080, height: 1800 }, "POSTER_INVALID_DIMENSIONS"],
      [{ width: 540, height: 960 }, "POSTER_SOURCE_TOO_SMALL"],
    ] as const;

    for (const [dimensions, code] of cases) {
      const processor = new PosterImageProcessor(
        loadPosterEnv({}),
        controlledRuntime("png", output, async () => {}, dimensions),
      );
      processors.push(processor);
      await expect(
        processor.process({
          bytes: png,
          contentType: "image/png",
          sha256: hash(png),
        }),
      ).rejects.toMatchObject({ code });
    }
  });

  it("maps Bun pixel-budget rejection to a safe domain error before resize", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const larger = await new Bun.Image(png).resize(2160, 3840).png().bytes();
    expect(larger.byteLength).toBeLessThan(5_000_000);
    const processor = new PosterImageProcessor(
      loadPosterEnv({
        MEDIA_POSTER_MAX_PIXELS: String(POSTER_WIDTH * POSTER_HEIGHT),
      }),
    );
    processors.push(processor);

    await expect(
      processor.process({
        bytes: larger,
        contentType: "image/png",
        sha256: hash(larger),
      }),
    ).rejects.toMatchObject({
      name: "PosterImageProcessingError",
      code: "POSTER_PIXEL_LIMIT",
      message: "The cover image exceeds the supported pixel limit.",
    });
  });

  it("enforces exact portrait geometry and keeps alpha in the final output", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const processor = new PosterImageProcessor(loadPosterEnv({}));
    processors.push(processor);
    const result = await processor.process({
      bytes: png,
      contentType: "image/png",
      sha256: hash(png),
    });
    const decodedPng = await new Bun.Image(result.bytes).png().bytes();
    const decodedMetadata = await new Bun.Image(decodedPng).metadata();
    expect(decodedMetadata).toEqual({
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      format: "png",
    });
    expect(pngAlphaAt(Buffer.from(decodedPng), 540, 3)).toBe(0);
  });

  it("rejects a busy instance immediately without queuing a second image", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const output = await new Bun.Image(png).webp({ quality: 85 }).bytes();
    let finishMetadata!: () => void;
    const metadataGate = new Promise<void>(
      (resolve) => (finishMetadata = resolve),
    );
    const processor = new PosterImageProcessor(
      loadPosterEnv({}),
      controlledRuntime("png", output, () => metadataGate),
    );
    processors.push(processor);
    const active = processor.process({
      bytes: png,
      contentType: "image/png",
      sha256: hash(png),
    });
    await Promise.resolve();

    await expect(
      processor.process({
        bytes: png,
        contentType: "image/png",
        sha256: hash(png),
      }),
    ).rejects.toMatchObject({ code: "POSTER_BUSY" });
    expect(processor.activeCount).toBe(1);
    finishMetadata();
    await active;
    expect(processor.activeCount).toBe(0);
  });

  it("fences timeout results and holds the slot until the native terminal settles", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const output = await new Bun.Image(png).webp({ quality: 85 }).bytes();
    let finishMetadata!: () => void;
    const metadataGate = new Promise<void>(
      (resolve) => (finishMetadata = resolve),
    );
    const processor = new PosterImageProcessor(
      { ...loadPosterEnv({}), timeoutSeconds: 0.02 },
      controlledRuntime("png", output, () => metadataGate),
    );
    processors.push(processor);
    const processing = processor.process({
      bytes: png,
      contentType: "image/png",
      sha256: hash(png),
    });

    await expect(processing).rejects.toMatchObject({ code: "POSTER_TIMEOUT" });
    expect(processor.activeCount).toBe(1);
    await expect(
      processor.process({
        bytes: png,
        contentType: "image/png",
        sha256: hash(png),
      }),
    ).rejects.toMatchObject({ code: "POSTER_BUSY" });
    finishMetadata();
    await shortWait(10);
    expect(processor.activeCount).toBe(0);
  });

  it("fences an aborted request and holds its slot until the terminal settles", async () => {
    const png = await readFixture("browser-cover-crop.png");
    const output = await new Bun.Image(png).webp({ quality: 85 }).bytes();
    let finishMetadata!: () => void;
    const metadataGate = new Promise<void>(
      (resolve) => (finishMetadata = resolve),
    );
    const processor = new PosterImageProcessor(
      loadPosterEnv({}),
      controlledRuntime("png", output, () => metadataGate),
    );
    processors.push(processor);
    const controller = new AbortController();
    const processing = processor.process({
      bytes: png,
      contentType: "image/png",
      sha256: hash(png),
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();

    await expect(processing).rejects.toMatchObject({ code: "POSTER_ABORTED" });
    expect(processor.activeCount).toBe(1);
    finishMetadata();
    await shortWait(10);
    expect(processor.activeCount).toBe(0);
  });
});
