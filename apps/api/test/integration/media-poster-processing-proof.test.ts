import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { expect, test } from "bun:test";
import type { S3Client } from "bun";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { videos } from "../../src/db/schema/videos";
import { mediaAssets } from "../../src/db/schema/media";
import { mediaJobAttempts, mediaJobs } from "../../src/db/schema/jobs";
import { uploadSessions } from "../../src/db/schema/upload";
import { loadPosterEnv } from "../../src/config/poster-env";
import { loadStorageEnv } from "../../src/config/storage-env";
import { MediaService } from "../../src/modules/media/service";
import { PosterProcessingService } from "../../src/modules/media/poster-processing";
import { createMediaRepository } from "../../src/modules/media/repository";
import type { MultipartStorage } from "../../src/storage/multipart";
import { resetMediaDatabase } from "./media-fixture";
import { createMediaCleanup } from "../../src/workers/cleanup";
import { loadWorkerEnv } from "../../src/config/worker-env";

const original = new Uint8Array(
  await Bun.file(
    new URL("../fixtures/media/browser-cover-crop.webp", import.meta.url),
  ).arrayBuffer(),
);
const hash = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const profile = loadStorageEnv({
  STORAGE_PROVIDER: "minio",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "cover-processing-proof",
  S3_ACCESS_KEY_ID: "integration-test",
  S3_SECRET_ACCESS_KEY: "integration-test-secret",
});

function fakeStorage(objects: Map<string, Uint8Array>, statFailures = 0) {
  let removeCalls = 0;
  let listKeysCalls = 0;
  let remainingStatFailures = statFailures;
  const storage = {
    async stat(key: string) {
      if (key.endsWith("poster-original") && remainingStatFailures > 0) {
        remainingStatFailures -= 1;
        throw new Error("injected storage outage");
      }
      const value = objects.get(key);
      if (!value)
        throw Object.assign(new Error("missing"), { name: "NotFound" });
      return {
        sizeBytes: value.byteLength,
        etag: `"${hash(value).slice(0, 24)}"`,
        contentType: "image/webp",
      };
    },
    async put(key: string, value: Uint8Array) {
      objects.set(key, new Uint8Array(value));
    },
    async listKeys(prefix: string) {
      listKeysCalls += 1;
      return [...objects.keys()].filter((key) => key.startsWith(prefix));
    },
    async remove(key: string) {
      removeCalls += 1;
      objects.delete(key);
    },
  } as unknown as MultipartStorage;
  return {
    storage,
    removeCalls: () => removeCalls,
    listKeysCalls: () => listKeysCalls,
  };
}

function fakeNative(
  objects: Map<string, Uint8Array>,
  pauseOriginal?: { started: () => void; wait: Promise<void> },
) {
  return {
    file(key: string) {
      return {
        stream() {
          const value = objects.get(key);
          if (!value)
            throw Object.assign(new Error("missing"), { name: "NotFound" });
          return new ReadableStream<Uint8Array>({
            async start(controller) {
              if (pauseOriginal && key.endsWith("poster-original")) {
                pauseOriginal.started();
                await pauseOriginal.wait;
              }
              controller.enqueue(new Uint8Array(value));
              controller.close();
            },
          });
        },
      };
    },
  } as unknown as S3Client;
}

async function seed(
  database: Awaited<ReturnType<typeof resetMediaDatabase>>,
  options: {
    mode?: "worker" | "request";
    expiredLease?: boolean;
    pauseOriginal?: { started: () => void; wait: Promise<void> };
    statFailures?: number;
    clock?: { now: () => Date; id?: () => string };
  } = {},
) {
  const now = options.clock?.now() ?? new Date();
  const videoId = crypto.randomUUID();
  const assetId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const leaseToken = options.expiredLease ? crypto.randomUUID() : null;
  const objectKey = `sources/${assetId}/poster-original`;
  await database.db.insert(videos).values({
    id: videoId,
    kind: "movie",
    title: "Poster processor proof",
    slug: `poster-proof-${videoId.slice(0, 8)}`,
    createdBy: "media-admin",
    updatedBy: "media-admin",
  });
  await database.db.insert(mediaAssets).values({
    id: assetId,
    videoId,
    kind: "poster",
    provider: profile.provider,
    bucket: profile.bucket,
    objectKey,
    state: options.expiredLease ? "processing" : "uploaded",
    sizeBytes: BigInt(original.byteLength),
    contentType: "image/webp",
    etag: `"${hash(original).slice(0, 24)}"`,
    generation: 1,
    createdBy: "media-admin",
    createdAt: now,
    updatedAt: now,
  });
  await database.db
    .update(videos)
    .set({ posterAssetId: assetId })
    .where(eq(videos.id, videoId));
  await database.db.insert(uploadSessions).values({
    id: sessionId,
    assetId,
    videoId,
    kind: "poster",
    processingMode: options.mode ?? "request",
    actorId: "media-admin",
    idempotencyKey: crypto.randomUUID(),
    requestHash: "a".repeat(64),
    expectedSha256: hash(original),
    filename: "cover.webp",
    stagingKey: `uploads/${sessionId}/original`,
    uploadId: "completed-fixture",
    status: "completed",
    sizeBytes: BigInt(original.byteLength),
    partSizeBytes: 5_242_880n,
    partCount: 1,
    expiresAt: new Date(now.getTime() + 86_400_000),
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await database.db.insert(mediaJobs).values({
    id: jobId,
    assetId,
    generation: 1,
    kind: "poster",
    executionMode: options.mode ?? "request",
    state: options.expiredLease ? "running" : "queued",
    attempts: options.expiredLease ? 1 : 0,
    failures: 0,
    runAfter: now,
    ...(options.expiredLease
      ? {
          leaseToken: leaseToken!,
          leaseUntil: new Date(now.getTime() - 1000),
        }
      : {}),
  });
  if (leaseToken) {
    await database.db.insert(mediaJobAttempts).values({
      token: leaseToken,
      jobId,
      attempt: 1,
      outputPrefix: `outputs/${assetId}/${jobId}/${leaseToken}/`,
      startedAt: new Date(now.getTime() - 120_000),
    });
  }
  const objects = new Map([[objectKey, original]]);
  const repository = createMediaRepository(database.db);
  const fake = fakeStorage(objects, options.statFailures);
  const storage = fake.storage;
  const processor = new PosterProcessingService(
    repository,
    storage,
    fakeNative(objects, options.pauseOriginal),
    profile,
    loadPosterEnv({}),
    options.clock
      ? {
          now: options.clock.now,
          id: options.clock.id ?? (() => crypto.randomUUID()),
        }
      : undefined,
  );
  return {
    assetId,
    videoId,
    jobId,
    sessionId,
    leaseToken,
    objects,
    repository,
    storage,
    removeCalls: fake.removeCalls,
    listKeysCalls: fake.listKeysCalls,
    processor,
  };
}

test("request processor verifies the stored WebP and commits one ready generation", async () => {
  const database = await resetMediaDatabase();
  try {
    const fixture = await seed(database);
    const service = new MediaService(
      fixture.repository,
      fixture.storage,
      profile,
      undefined,
      fixture.processor,
    );
    const first = await service.processPoster(fixture.sessionId, "media-admin");
    const replay = await service.processPoster(
      fixture.sessionId,
      "media-admin",
    );
    expect(first.processing).toMatchObject({
      state: "ready",
      jobState: "succeeded",
      attempts: 1,
    });
    expect(replay.processing).toMatchObject({
      state: "ready",
      jobState: "succeeded",
      attempts: 1,
    });
    expect(first.processingMode).toBe("request");
    expect(first.canProcessPoster).toBe(false);
    const [asset] = await database.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, fixture.assetId));
    const [job] = await database.db
      .select()
      .from(mediaJobs)
      .where(eq(mediaJobs.id, fixture.jobId));
    const attempts = await database.db.select().from(mediaJobAttempts);
    expect(asset.readyJobId).toBe(job.id);
    expect(asset.facts).toMatchObject({ width: 1080, height: 1920 });
    expect(asset.sha256).toBe(hash(original));
    expect(asset.facts?.outputSha256).toBeTruthy();
    expect(job.outputFiles).toEqual(["poster.webp"]);
    expect(job.outputPrefix).toMatch(
      new RegExp(
        `^outputs/${fixture.assetId}/${fixture.jobId}/[a-f0-9-]{36}/$`,
      ),
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.stoppedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(first)).not.toMatch(
      /objectKey|bucket|leaseToken|accessKey/,
    );
    expect(fixture.objects.size).toBe(2);
    const workdir = await mkdtemp("/var/tmp/vertical-movie-poster-cleanup-");
    try {
      const cleanup = createMediaCleanup({
        client: database.client,
        repo: fixture.repository,
        storage: fixture.storage,
        profile,
        workerEnv: loadWorkerEnv({
          MEDIA_WORKER_WORKDIR: join(workdir, "work"),
          MEDIA_WORKER_MIN_FREE_BYTES: "1",
        }),
        now: () => new Date(Date.now() + 2 * 86400_000),
      });
      await cleanup();
      expect(fixture.listKeysCalls()).toBe(0);
      expect(fixture.removeCalls()).toBe(0);
      expect(fixture.objects.size).toBe(2);
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  } finally {
    await database.client.close();
  }
}, 30000);

test("request processing recovers an expired attempt with a new fenced output prefix", async () => {
  const database = await resetMediaDatabase();
  try {
    const fixture = await seed(database, { expiredLease: true });
    await fixture.processor.process(fixture.sessionId, "media-admin");
    const [job] = await database.db
      .select()
      .from(mediaJobs)
      .where(eq(mediaJobs.id, fixture.jobId));
    const attempts = (await database.db.select().from(mediaJobAttempts)).sort(
      (left, right) => left.attempt - right.attempt,
    );
    expect(job.state).toBe("succeeded");
    expect(job.attempts).toBe(2);
    expect(job.failures).toBe(1);
    expect(attempts).toHaveLength(2);
    expect(attempts[0]?.failureCode).toBe("MEDIA_LEASE_EXPIRED");
    expect(attempts[0]?.outputPrefix).not.toBe(attempts[1]?.outputPrefix);
  } finally {
    await database.client.close();
  }
}, 30000);

test("simultaneous process requests share one durable claim and output attempt", async () => {
  const database = await resetMediaDatabase();
  let signalStarted!: () => void;
  let releaseRead!: () => void;
  const started = new Promise<void>((resolve) => (signalStarted = resolve));
  const waiting = new Promise<void>((resolve) => (releaseRead = resolve));
  try {
    const fixture = await seed(database, {
      pauseOriginal: { started: signalStarted, wait: waiting },
    });
    const first = fixture.processor.process(fixture.sessionId, "media-admin");
    await started;
    await expect(
      fixture.processor.process(fixture.sessionId, "media-admin"),
    ).rejects.toMatchObject({ code: "POSTER_PROCESSING_BUSY" });
    releaseRead();
    await first;
    const attempts = await database.db.select().from(mediaJobAttempts);
    expect(attempts).toHaveLength(1);
    const [job] = await database.db
      .select()
      .from(mediaJobs)
      .where(eq(mediaJobs.id, fixture.jobId));
    expect(job.state).toBe("succeeded");
    expect(job.attempts).toBe(1);
  } finally {
    releaseRead?.();
    await database.client.close();
  }
}, 30000);

test("replacement during native processing fences the stale cover from Ready", async () => {
  const database = await resetMediaDatabase();
  let signalStarted!: () => void;
  let releaseRead!: () => void;
  const started = new Promise<void>((resolve) => (signalStarted = resolve));
  const waiting = new Promise<void>((resolve) => (releaseRead = resolve));
  try {
    const fixture = await seed(database, {
      pauseOriginal: { started: signalStarted, wait: waiting },
    });
    const processing = fixture.processor.process(
      fixture.sessionId,
      "media-admin",
    );
    await started;
    const replacementId = crypto.randomUUID();
    await database.db.insert(mediaAssets).values({
      id: replacementId,
      videoId: fixture.videoId,
      kind: "poster",
      provider: profile.provider,
      bucket: profile.bucket,
      objectKey: `sources/${replacementId}/poster-original`,
      state: "uploaded",
      sizeBytes: BigInt(original.byteLength),
      contentType: "image/webp",
      createdBy: "media-admin",
    });
    await database.db
      .update(videos)
      .set({ posterAssetId: replacementId })
      .where(eq(videos.id, fixture.videoId));
    releaseRead();
    await expect(processing).rejects.toMatchObject({
      code: "POSTER_PROCESSING_RETRY",
    });
    const [oldAsset] = await database.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, fixture.assetId));
    const [video] = await database.db
      .select()
      .from(videos)
      .where(eq(videos.id, fixture.videoId));
    const [job] = await database.db
      .select()
      .from(mediaJobs)
      .where(eq(mediaJobs.id, fixture.jobId));
    expect(video.posterAssetId).toBe(replacementId);
    expect(oldAsset.readyJobId).toBeNull();
    expect(oldAsset.state).toBe("uploaded");
    expect(job.state).toBe("retry");
    expect(job.failures).toBe(1);
  } finally {
    releaseRead?.();
    await database.client.close();
  }
}, 30000);

test("transient storage errors retry at one/two seconds and fail after attempt three", async () => {
  const database = await resetMediaDatabase();
  let current = new Date();
  const clock = { now: () => current, id: () => crypto.randomUUID() };
  try {
    const fixture = await seed(database, { statFailures: 3, clock });
    for (let index = 0; index < 3; index += 1) {
      const error = fixture.processor
        .process(fixture.sessionId, "media-admin")
        .then(
          () => undefined,
          (reason: unknown) => reason,
        );
      const result = await error;
      expect(result).toMatchObject(
        index < 2
          ? {
              code: "POSTER_PROCESSING_RETRY",
              httpStatus: 503,
              retryAfterSeconds: index + 1,
            }
          : { code: "STORAGE_UNAVAILABLE", httpStatus: 503 },
      );
      const [job] = await database.db
        .select()
        .from(mediaJobs)
        .where(eq(mediaJobs.id, fixture.jobId));
      expect(job.failures).toBe(index + 1);
      expect(job.state).toBe(index < 2 ? "retry" : "failed");
      if (job.runAfter > current) current = job.runAfter;
    }
    const attempts = (await database.db.select().from(mediaJobAttempts)).sort(
      (left, right) => left.attempt - right.attempt,
    );
    expect(attempts).toHaveLength(3);
    expect(attempts.every((attempt) => attempt.stoppedAt instanceof Date)).toBe(
      true,
    );
    expect(attempts.map((attempt) => attempt.failureCode)).toEqual([
      "STORAGE_UNAVAILABLE",
      "STORAGE_UNAVAILABLE",
      "STORAGE_UNAVAILABLE",
    ]);
  } finally {
    await database.client.close();
  }
}, 30000);

test("request endpoint refuses legacy worker-mode poster sessions", async () => {
  const database = await resetMediaDatabase();
  try {
    const fixture = await seed(database, { mode: "worker" });
    await expect(
      fixture.processor.process(fixture.sessionId, "media-admin"),
    ).rejects.toMatchObject({ code: "POSTER_PROCESSING_UNAVAILABLE" });
    const [job] = await database.db
      .select()
      .from(mediaJobs)
      .where(eq(mediaJobs.id, fixture.jobId));
    expect(job.state).toBe("queued");
    expect(job.attempts).toBe(0);
  } finally {
    await database.client.close();
  }
}, 30000);
