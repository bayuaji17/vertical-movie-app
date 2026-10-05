import { createHash } from "node:crypto";
import type { PosterEnv } from "../../config/poster-env";
import { uploadLimit } from "./policy";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;
export const POSTER_MAX_BYTES = Number(uploadLimit("poster"));

export type PosterImageErrorCode =
  | "POSTER_ABORTED"
  | "POSTER_ANIMATED_IMAGE"
  | "POSTER_BUSY"
  | "POSTER_HASH_MISMATCH"
  | "POSTER_INVALID_DIMENSIONS"
  | "POSTER_INVALID_IMAGE"
  | "POSTER_INVALID_OUTPUT"
  | "POSTER_INVALID_TYPE"
  | "POSTER_PIXEL_LIMIT"
  | "POSTER_SOURCE_TOO_LARGE"
  | "POSTER_SOURCE_TOO_SMALL"
  | "POSTER_TIMEOUT";

const safeMessages: Record<PosterImageErrorCode, string> = {
  POSTER_ABORTED: "Cover processing was interrupted.",
  POSTER_ANIMATED_IMAGE: "Animated cover images are not supported.",
  POSTER_BUSY: "Cover processing is busy. Try again shortly.",
  POSTER_HASH_MISMATCH: "The uploaded cover fingerprint does not match.",
  POSTER_INVALID_DIMENSIONS: "Cover must use a 9:16 portrait aspect ratio.",
  POSTER_INVALID_IMAGE: "The uploaded cover image is invalid or unsupported.",
  POSTER_INVALID_OUTPUT: "The processed cover could not be verified.",
  POSTER_INVALID_TYPE: "Only static PNG and WebP covers are supported.",
  POSTER_PIXEL_LIMIT: "The cover image exceeds the supported pixel limit.",
  POSTER_SOURCE_TOO_LARGE: "The cover image exceeds the 5 MB limit.",
  POSTER_SOURCE_TOO_SMALL:
    "The cover must be at least 1080 × 1920 pixels before processing.",
  POSTER_TIMEOUT: "Cover processing exceeded its time limit.",
};

export class PosterImageProcessingError extends Error {
  readonly code: PosterImageErrorCode;

  constructor(code: PosterImageErrorCode) {
    super(safeMessages[code]);
    this.name = "PosterImageProcessingError";
    this.code = code;
  }
}

type PosterMetadata = { width: number; height: number; format: string };
type PosterImagePipeline = {
  metadata(): Promise<PosterMetadata>;
  resize(
    width: number,
    height: number,
    options?: { fit?: "fill" | "inside"; withoutEnlargement?: boolean },
  ): PosterImagePipeline;
  webp(options?: { quality?: number; lossless?: boolean }): PosterImagePipeline;
  bytes(): Promise<Uint8Array>;
};

export type PosterImageRuntime = {
  createImage: (
    bytes: Uint8Array,
    options: { maxPixels: number; autoOrient: boolean },
  ) => PosterImagePipeline;
};

export type ProcessPosterInput = {
  bytes: Uint8Array;
  contentType: string;
  sha256: string;
  signal?: AbortSignal;
};

export type ProcessedPoster = {
  bytes: Uint8Array;
  contentType: "image/webp";
  sha256: string;
  width: typeof POSTER_WIDTH;
  height: typeof POSTER_HEIGHT;
};

type Container = "png" | "webp";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const nativeRuntime: PosterImageRuntime = {
  createImage: (bytes, options) =>
    new Bun.Image(bytes, options) as unknown as PosterImagePipeline,
};

function invalidImage(): never {
  throw new PosterImageProcessingError("POSTER_INVALID_IMAGE");
}

function inspectPng(bytes: Buffer): Container {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(pngSignature))
    invalidImage();

  let offset = 8;
  let chunkCount = 0;
  let seenImageData = false;
  let ended = false;
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) invalidImage();
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length) invalidImage();
    if (chunkCount === 0 && (type !== "IHDR" || length !== 13)) invalidImage();
    if (type === "acTL")
      throw new PosterImageProcessingError("POSTER_ANIMATED_IMAGE");
    if (type === "IDAT") seenImageData = true;
    if (type === "IEND") {
      if (length !== 0 || end !== bytes.length || !seenImageData)
        invalidImage();
      ended = true;
      break;
    }
    offset = end;
    chunkCount += 1;
  }
  if (!ended) invalidImage();
  return "png";
}

function inspectWebp(bytes: Buffer): Container {
  if (
    bytes.length < 20 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP" ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  ) {
    invalidImage();
  }

  let offset = 12;
  let hasStaticFrame = false;
  let hasFrame = false;
  while (offset < bytes.length) {
    if (bytes.length - offset < 8) invalidImage();
    const type = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + length;
    const paddedEnd = payloadEnd + (length % 2);
    if (payloadEnd > bytes.length || paddedEnd > bytes.length) invalidImage();

    if (type === "VP8X") {
      if (length < 10) invalidImage();
      if ((bytes[payloadStart]! & 0x02) !== 0)
        throw new PosterImageProcessingError("POSTER_ANIMATED_IMAGE");
    }
    if (type === "ANIM" || type === "ANMF")
      throw new PosterImageProcessingError("POSTER_ANIMATED_IMAGE");
    if (type === "VP8 " || type === "VP8L") hasStaticFrame = true;
    if (type === "VP8 " || type === "VP8L" || type === "ANMF") hasFrame = true;

    offset = paddedEnd;
  }
  if (offset !== bytes.length || !hasStaticFrame || !hasFrame) invalidImage();
  return "webp";
}

function inspectContainer(bytes: Buffer, contentType: string): Container {
  if (contentType === "image/png") return inspectPng(bytes);
  if (contentType === "image/webp") return inspectWebp(bytes);
  throw new PosterImageProcessingError("POSTER_INVALID_TYPE");
}

function fingerprint(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function nativeFailure(error: unknown): PosterImageProcessingError {
  if (error instanceof PosterImageProcessingError) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_IMAGE_TOO_MANY_PIXELS"
  ) {
    return new PosterImageProcessingError("POSTER_PIXEL_LIMIT");
  }
  return new PosterImageProcessingError("POSTER_INVALID_IMAGE");
}

function checkAspect(metadata: PosterMetadata) {
  if (metadata.width * 16 !== metadata.height * 9)
    throw new PosterImageProcessingError("POSTER_INVALID_DIMENSIONS");
  if (metadata.width < POSTER_WIDTH || metadata.height < POSTER_HEIGHT)
    throw new PosterImageProcessingError("POSTER_SOURCE_TOO_SMALL");
}

export class PosterImageProcessor {
  private active = 0;

  constructor(
    private readonly config: PosterEnv,
    private readonly runtime: PosterImageRuntime = nativeRuntime,
  ) {}

  get activeCount() {
    return this.active;
  }

  async process(input: ProcessPosterInput): Promise<ProcessedPoster> {
    if (input.signal?.aborted)
      throw new PosterImageProcessingError("POSTER_ABORTED");
    if (input.bytes.byteLength === 0)
      throw new PosterImageProcessingError("POSTER_INVALID_IMAGE");
    if (input.bytes.byteLength > POSTER_MAX_BYTES)
      throw new PosterImageProcessingError("POSTER_SOURCE_TOO_LARGE");
    if (!/^[a-f0-9]{64}$/.test(input.sha256))
      throw new PosterImageProcessingError("POSTER_HASH_MISMATCH");
    if (input.contentType !== "image/png" && input.contentType !== "image/webp")
      throw new PosterImageProcessingError("POSTER_INVALID_TYPE");

    if (this.active >= this.config.concurrency)
      throw new PosterImageProcessingError("POSTER_BUSY");
    this.active += 1;

    let bytes: Buffer;
    try {
      bytes = Buffer.from(input.bytes);
    } catch {
      this.active -= 1;
      throw new PosterImageProcessingError("POSTER_INVALID_IMAGE");
    }

    let rejectInterrupted!: (reason: PosterImageProcessingError) => void;
    let timedOut = false;
    const interrupted = new Promise<never>((_, reject) => {
      rejectInterrupted = reject;
    });
    const onAbort = () =>
      rejectInterrupted(new PosterImageProcessingError("POSTER_ABORTED"));
    input.signal?.addEventListener("abort", onAbort, { once: true });
    const deadlineAt = Date.now() + this.config.timeoutSeconds * 1000;
    const timer = setTimeout(() => {
      timedOut = true;
      rejectInterrupted(new PosterImageProcessingError("POSTER_TIMEOUT"));
    }, this.config.timeoutSeconds * 1000);

    const checkInterrupted = () => {
      if (input.signal?.aborted)
        throw new PosterImageProcessingError("POSTER_ABORTED");
      if (timedOut || Date.now() >= deadlineAt) {
        timedOut = true;
        throw new PosterImageProcessingError("POSTER_TIMEOUT");
      }
    };

    const work = Promise.resolve()
      .then(() => {
        if (fingerprint(bytes) !== input.sha256)
          throw new PosterImageProcessingError("POSTER_HASH_MISMATCH");
        const container = inspectContainer(bytes, input.contentType);
        checkInterrupted();
        return this.processImage(bytes, container, checkInterrupted);
      })
      .catch((error: unknown) => {
        throw nativeFailure(error);
      })
      .finally(() => {
        this.active -= 1;
      });

    try {
      return await Promise.race([work, interrupted]);
    } finally {
      clearTimeout(timer);
      input.signal?.removeEventListener("abort", onAbort);
    }
  }

  private async processImage(
    bytes: Buffer,
    container: Container,
    checkInterrupted: () => void,
  ): Promise<ProcessedPoster> {
    const source = this.runtime.createImage(bytes, {
      maxPixels: this.config.maxPixels,
      autoOrient: true,
    });
    const sourceMetadata = await source.metadata();
    checkInterrupted();
    if (sourceMetadata.format !== container)
      throw new PosterImageProcessingError("POSTER_INVALID_TYPE");
    checkAspect(sourceMetadata);

    const output = await source
      .resize(POSTER_WIDTH, POSTER_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .bytes();
    checkInterrupted();
    if (output.byteLength === 0 || output.byteLength > POSTER_MAX_BYTES)
      throw new PosterImageProcessingError("POSTER_INVALID_OUTPUT");

    const outputBytes = Buffer.from(output);
    try {
      inspectWebp(outputBytes);
    } catch {
      throw new PosterImageProcessingError("POSTER_INVALID_OUTPUT");
    }
    let outputMetadata: PosterMetadata;
    try {
      outputMetadata = await this.runtime
        .createImage(outputBytes, {
          maxPixels: this.config.maxPixels,
          autoOrient: true,
        })
        .metadata();
    } catch {
      throw new PosterImageProcessingError("POSTER_INVALID_OUTPUT");
    }
    checkInterrupted();
    if (
      outputMetadata.format !== "webp" ||
      outputMetadata.width !== POSTER_WIDTH ||
      outputMetadata.height !== POSTER_HEIGHT
    ) {
      throw new PosterImageProcessingError("POSTER_INVALID_OUTPUT");
    }

    const outputHash = fingerprint(outputBytes);
    checkInterrupted();
    return {
      bytes: outputBytes,
      contentType: "image/webp",
      sha256: outputHash,
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
    };
  }
}
