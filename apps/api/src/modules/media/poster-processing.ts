import { createHash } from "node:crypto";
import type { S3Client } from "bun";
import type { StorageEnv } from "../../config/storage-env";
import { ContentError, notFound } from "../../shared/content-error";
import type { MediaRepository, UploadRow, AssetRow } from "./repository";
import type { Owner } from "./policy";
import {
  PosterImageProcessingError,
  PosterImageProcessor,
  POSTER_MAX_BYTES,
} from "./poster-image";
import type { PosterEnv } from "../../config/poster-env";
import type { MultipartStorage } from "../../storage/multipart";

const MAX_ATTEMPTS = 3;
const LEASE_SECONDS = 60;
const RETRY_DELAYS_SECONDS = [1, 2] as const;

type Runtime = { now: () => Date; id: () => string };
type Claim = {
  session: UploadRow;
  asset: AssetRow;
  jobId: string;
  token: string;
  attempt: number;
  outputPrefix: string;
};

function ownerOf(session: UploadRow): Owner {
  return {
    ownerType: session.videoId ? "video" : "series",
    ownerId: (session.videoId ?? session.seriesId)!,
  };
}

function conflict(
  code: string,
  message: string,
  retryAfterSeconds?: number,
): never {
  throw new ContentError(code, message, 409, retryAfterSeconds);
}

function invalid(code: string, message: string): never {
  throw new ContentError(code, message, 422);
}

function digest(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readBoundedObject(
  native: S3Client,
  key: string,
  signal: AbortSignal | undefined,
  maxBytes = POSTER_MAX_BYTES,
) {
  const reader = native.file(key).stream().getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const cancel = () =>
    void reader.cancel(signal?.reason).catch(() => undefined);
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      if (signal?.aborted)
        throw new PosterImageProcessingError("POSTER_ABORTED");
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > maxBytes)
        throw new PosterImageProcessingError("POSTER_SOURCE_TOO_LARGE");
      chunks.push(item.value);
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function editable(owner: { archived: boolean; status: string }) {
  if (owner.archived || owner.status !== "draft")
    throw new ContentError(
      "CONTENT_STATE_CONFLICT",
      "Cover processing requires active draft content.",
    );
}

export class PosterProcessingService {
  private readonly processor: PosterImageProcessor;

  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: MultipartStorage,
    private readonly native: S3Client,
    private readonly profile: StorageEnv,
    posterEnv: PosterEnv,
    private readonly runtime: Runtime = {
      now: () => new Date(),
      id: () => crypto.randomUUID(),
    },
    processor?: PosterImageProcessor,
  ) {
    this.processor = processor ?? new PosterImageProcessor(posterEnv);
  }

  async process(id: string, actor: string, signal?: AbortSignal) {
    const claim = await this.claim(id, actor);
    if (claim === null)
      conflict(
        "POSTER_PROCESSING_EXHAUSTED",
        "Cover processing could not be recovered after repeated interruptions.",
      );
    if (!claim) return;

    try {
      if (signal?.aborted)
        throw new PosterImageProcessingError("POSTER_ABORTED");
      const { asset, session } = claim;
      const original = await this.storage.stat(asset.objectKey);
      if (
        BigInt(original.sizeBytes) !== session.sizeBytes ||
        BigInt(original.sizeBytes) !== asset.sizeBytes ||
        original.contentType !== asset.contentType ||
        !asset.etag ||
        original.etag !== asset.etag
      )
        throw new PosterImageProcessingError("POSTER_HASH_MISMATCH");

      const input = await readBoundedObject(
        this.native,
        asset.objectKey,
        signal,
      );
      if (!session.expectedSha256)
        throw new PosterImageProcessingError("POSTER_HASH_MISMATCH");
      const output = await this.processor.process({
        bytes: input,
        contentType: asset.contentType,
        sha256: session.expectedSha256,
        signal,
      });
      if (signal?.aborted)
        throw new PosterImageProcessingError("POSTER_ABORTED");

      const outputKey = claim.outputPrefix + "poster.webp";
      await this.storage.put(outputKey, output.bytes, output.contentType);
      const outputStat = await this.storage.stat(outputKey);
      if (
        outputStat.sizeBytes !== output.bytes.byteLength ||
        outputStat.contentType !== output.contentType ||
        !outputStat.etag
      )
        throw new PosterImageProcessingError("POSTER_INVALID_OUTPUT");
      const storedOutput = await readBoundedObject(
        this.native,
        outputKey,
        signal,
      );
      if (
        storedOutput.byteLength !== output.bytes.byteLength ||
        digest(storedOutput) !== output.sha256
      )
        throw new PosterImageProcessingError("POSTER_INVALID_OUTPUT");

      await this.finish(
        claim,
        session.expectedSha256,
        output.sha256,
        output.width,
        output.height,
      );
    } catch (error) {
      const failure = this.toFailure(error);
      const outcome = await this.fail(claim, failure.code, failure.terminal);
      if (outcome.retryAfterSeconds !== undefined)
        throw new ContentError(
          "POSTER_PROCESSING_RETRY",
          "Cover processing failed temporarily. Retry after the supplied delay.",
          503,
          outcome.retryAfterSeconds,
        );
      throw new ContentError(
        failure.code,
        failure.message,
        failure.terminal ? 422 : 503,
      );
    }
  }

  private async claim(
    id: string,
    actor: string,
  ): Promise<Claim | undefined | null> {
    return this.repository.transact(async (store) => {
      const initial = await store.session(id);
      if (!initial || initial.actorId !== actor) notFound();
      const owner = await store.owner(ownerOf(initial), true);
      editable(owner);
      const session = await store.session(id, true);
      if (!session || session.actorId !== actor) notFound();
      if (session.kind !== "poster" || session.processingMode !== "request")
        invalid(
          "POSTER_PROCESSING_UNAVAILABLE",
          "This upload is not eligible for request-based cover processing.",
        );
      if (session.status !== "completed")
        conflict(
          "POSTER_UPLOAD_INCOMPLETE",
          "Complete the cover upload before processing it.",
        );
      const asset = await store.asset(session.assetId, true);
      if (!asset) notFound();
      if (
        asset.kind !== "poster" ||
        asset.provider !== this.profile.provider ||
        asset.bucket !== this.profile.bucket ||
        asset.deletedAt ||
        owner.posterAssetId !== asset.id
      )
        conflict(
          "POSTER_ASSET_CHANGED",
          "The cover is no longer the active upload for this content.",
        );
      if (!session.expectedSha256)
        invalid(
          "POSTER_HASH_MISMATCH",
          "This cover upload has no verifiable file fingerprint.",
        );
      const job = await store.assetJob(asset.id, asset.generation, true);
      if (!job || job.kind !== "poster" || job.executionMode !== "request")
        invalid(
          "POSTER_PROCESSING_UNAVAILABLE",
          "This cover is not eligible for request-based processing.",
        );
      if (
        job.state === "succeeded" &&
        asset.state === "ready" &&
        asset.readyJobId === job.id &&
        asset.verifiedReadyAt
      )
        return;
      if (job.state === "succeeded")
        conflict(
          "POSTER_OUTPUT_INVALID",
          "The completed cover output is not verified for this asset.",
        );
      let failures = job.failures;
      let runAfter = job.runAfter;
      if (job.state === "running") {
        if (job.leaseUntil && job.leaseUntil > this.runtime.now()) {
          const seconds = Math.max(
            1,
            Math.ceil(
              (job.leaseUntil.getTime() - this.runtime.now().getTime()) / 1000,
            ),
          );
          conflict(
            "POSTER_PROCESSING_BUSY",
            "Cover processing is already in progress.",
            seconds,
          );
        }
        const expiredAt = this.runtime.now();
        await store.stopAttempt(
          job.leaseToken!,
          expiredAt,
          "MEDIA_LEASE_EXPIRED",
        );
        failures += 1;
        const exhausted = failures >= MAX_ATTEMPTS;
        runAfter = expiredAt;
        await store.finishJob(job.id, {
          state: exhausted ? "failed" : "retry",
          failures,
          runAfter: expiredAt,
          leaseToken: null,
          leaseUntil: null,
          failureCode: "MEDIA_LEASE_EXPIRED",
          finishedAt: exhausted ? expiredAt : null,
          updatedAt: expiredAt,
        });
        if (exhausted) {
          await store.updateAsset(asset.id, {
            state: "failed",
            failedAt: expiredAt,
            updatedAt: expiredAt,
          });
          return null;
        }
      }
      if (
        ["failed", "cancelled"].includes(job.state) ||
        failures >= MAX_ATTEMPTS
      )
        conflict(
          "POSTER_PROCESSING_EXHAUSTED",
          "Cover processing has exhausted its retry limit.",
        );
      const now = this.runtime.now();
      if (runAfter > now) {
        const seconds = Math.max(
          1,
          Math.ceil((runAfter.getTime() - now.getTime()) / 1000),
        );
        conflict(
          "POSTER_PROCESSING_RETRY",
          "Cover processing is waiting for its retry delay.",
          seconds,
        );
      }
      const token = this.runtime.id();
      const attempt = job.attempts + 1;
      const outputPrefix =
        "outputs/" + asset.id + "/" + job.id + "/" + token + "/";
      await store.finishJob(job.id, {
        state: "running",
        attempts: attempt,
        leaseToken: token,
        leaseUntil: new Date(now.getTime() + LEASE_SECONDS * 1000),
        heartbeatAt: now,
        startedAt: now,
        finishedAt: null,
        progressSeconds: 0,
        failureCode: null,
        outputPrefix,
        outputFiles: [],
        updatedAt: now,
      });
      await store.insertAttempt({
        token,
        jobId: job.id,
        attempt,
        outputPrefix,
        startedAt: now,
      });
      await store.updateAsset(asset.id, {
        state: "processing",
        failedAt: null,
        updatedAt: now,
      });
      return { session, asset, jobId: job.id, token, attempt, outputPrefix };
    });
  }

  private async finish(
    claim: Claim,
    sourceSha256: string,
    outputSha256: string,
    width: number,
    height: number,
  ) {
    await this.repository.transact(async (store) => {
      const owner = await store.owner(ownerOf(claim.session), true);
      const session = await store.session(claim.session.id, true);
      const asset = await store.asset(claim.asset.id, true);
      const job = await store.job(claim.jobId, true);
      const now = this.runtime.now();
      if (
        !session ||
        session.actorId !== claim.session.actorId ||
        session.processingMode !== "request" ||
        !asset ||
        asset.generation !== claim.asset.generation ||
        asset.deletedAt ||
        owner.posterAssetId !== asset.id ||
        owner.archived ||
        owner.status !== "draft" ||
        !job ||
        job.executionMode !== "request" ||
        job.state !== "running" ||
        job.leaseToken !== claim.token ||
        !job.leaseUntil ||
        job.leaseUntil <= now
      )
        conflict(
          "POSTER_PROCESSING_STALE",
          "Cover processing lost its active generation or claim.",
        );
      await store.finishJob(job.id, {
        state: "succeeded",
        leaseToken: null,
        leaseUntil: null,
        failureCode: null,
        outputPrefix: claim.outputPrefix,
        outputFiles: ["poster.webp"],
        finishedAt: now,
        updatedAt: now,
      });
      await store.updateAsset(asset.id, {
        state: "ready",
        readyJobId: job.id,
        sha256: sourceSha256,
        facts: { width, height, outputSha256 },
        verifiedReadyAt: now,
        failedAt: null,
        updatedAt: now,
      });
      await store.stopAttempt(claim.token, now);
    });
  }

  private toFailure(error: unknown) {
    if (error instanceof PosterImageProcessingError) {
      const retryable = [
        "POSTER_ABORTED",
        "POSTER_BUSY",
        "POSTER_TIMEOUT",
      ].includes(error.code);
      return {
        code: error.code,
        message: error.message,
        terminal: !retryable,
      };
    }
    if (error instanceof ContentError) {
      return {
        code: error.code,
        message: error.message,
        terminal: error.httpStatus === 422,
      };
    }
    return {
      code: "STORAGE_UNAVAILABLE",
      message: "Cover storage is temporarily unavailable.",
      terminal: false,
    };
  }

  private async fail(claim: Claim, code: string, terminal: boolean) {
    return this.repository.transact(async (store) => {
      await store.owner(ownerOf(claim.session), true);
      await store.session(claim.session.id, true);
      const asset = await store.asset(claim.asset.id, true);
      const job = await store.job(claim.jobId, true);
      const now = this.runtime.now();
      if (
        !asset ||
        !job ||
        job.state !== "running" ||
        job.leaseToken !== claim.token
      )
        return { retryAfterSeconds: undefined };
      const failures = job.failures + 1;
      const exhausted = terminal || failures >= MAX_ATTEMPTS;
      const retryAfterSeconds = exhausted
        ? undefined
        : (RETRY_DELAYS_SECONDS[failures - 1] ?? 2);
      await store.finishJob(job.id, {
        state: exhausted ? "failed" : "retry",
        failures,
        runAfter: new Date(now.getTime() + (retryAfterSeconds ?? 0) * 1000),
        leaseToken: null,
        leaseUntil: null,
        failureCode: code,
        finishedAt: exhausted ? now : null,
        updatedAt: now,
      });
      await store.stopAttempt(claim.token, now, code);
      await store.updateAsset(asset.id, {
        state: exhausted ? "failed" : "uploaded",
        failedAt: exhausted ? now : null,
        updatedAt: now,
      });
      return { retryAfterSeconds };
    });
  }
}
