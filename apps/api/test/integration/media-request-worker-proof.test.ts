import { expect, test } from "bun:test";
import { resetMediaDatabase } from "./media-fixture";
import { videos } from "../../src/db/schema/videos";
import { mediaAssets } from "../../src/db/schema/media";
import { mediaJobs, mediaJobAttempts } from "../../src/db/schema/jobs";
import { loadWorkerEnv } from "../../src/config/worker-env";
import { createMediaQueue } from "../../src/workers/queue";

test("worker claim and recovery leave request-mode poster jobs untouched", async () => {
  const database = await resetMediaDatabase();
  try {
    const videoId = crypto.randomUUID();
    const requestQueuedAssetId = crypto.randomUUID();
    const requestRunningAssetId = crypto.randomUUID();
    const workerAssetId = crypto.randomUUID();
    const expiredToken = crypto.randomUUID();
    const expiredJobId = crypto.randomUUID();
    const requestQueuedJobId = crypto.randomUUID();
    const workerJobId = crypto.randomUUID();
    const now = new Date();
    await database.db.insert(videos).values({
      id: videoId,
      kind: "movie",
      title: "Request executor proof",
      slug: "request-executor-proof",
      createdBy: "media-admin",
      updatedBy: "media-admin",
    });
    await database.db.insert(mediaAssets).values([
      {
        id: requestQueuedAssetId,
        videoId,
        kind: "poster",
        provider: "minio",
        bucket: "request-worker-proof",
        objectKey: `sources/${requestQueuedAssetId}/poster-original`,
        state: "uploaded",
        sizeBytes: 100n,
        contentType: "image/webp",
        createdBy: "media-admin",
      },
      {
        id: requestRunningAssetId,
        videoId,
        kind: "poster",
        provider: "minio",
        bucket: "request-worker-proof",
        objectKey: `sources/${requestRunningAssetId}/poster-original`,
        state: "processing",
        sizeBytes: 100n,
        contentType: "image/webp",
        createdBy: "media-admin",
      },
      {
        id: workerAssetId,
        videoId,
        kind: "source",
        provider: "minio",
        bucket: "request-worker-proof",
        objectKey: `sources/${workerAssetId}/original`,
        state: "uploaded",
        sizeBytes: 100n,
        contentType: "video/mp4",
        createdBy: "media-admin",
      },
    ]);
    await database.db.insert(mediaJobs).values([
      {
        id: requestQueuedJobId,
        assetId: requestQueuedAssetId,
        generation: 1,
        kind: "poster",
        executionMode: "request",
        state: "queued",
        runAfter: now,
      },
      {
        id: expiredJobId,
        assetId: requestRunningAssetId,
        generation: 1,
        kind: "poster",
        executionMode: "request",
        state: "running",
        attempts: 1,
        failures: 0,
        leaseToken: expiredToken,
        leaseUntil: new Date(now.getTime() - 1000),
        runAfter: now,
      },
      {
        id: workerJobId,
        assetId: workerAssetId,
        generation: 1,
        kind: "source",
        executionMode: "worker",
        state: "queued",
        runAfter: now,
      },
    ]);
    await database.db.insert(mediaJobAttempts).values({
      token: expiredToken,
      jobId: expiredJobId,
      attempt: 1,
      outputPrefix: `outputs/${requestRunningAssetId}/${expiredJobId}/${expiredToken}/`,
      startedAt: new Date(now.getTime() - 120_000),
    });

    const queue = createMediaQueue(database.client, loadWorkerEnv());
    expect((await queue.recover()).recovered).toBe(0);
    const claim = await queue.claim();
    expect(claim?.id).toBe(workerJobId);
    const [queuedRequest] = await database.client`
        SELECT state,execution_mode FROM media_jobs WHERE id=${requestQueuedJobId}::uuid
      `;
    const [expiredRequest] = await database.client`
        SELECT state,execution_mode,lease_token FROM media_jobs WHERE id=${expiredJobId}::uuid
      `;
    const [attempt] = await database.client`
        SELECT stopped_at FROM media_job_attempts WHERE token=${expiredToken}::uuid
      `;
    expect(queuedRequest).toEqual({
      state: "queued",
      execution_mode: "request",
    });
    expect(expiredRequest).toEqual({
      state: "running",
      execution_mode: "request",
      lease_token: expiredToken,
    });
    expect(attempt.stopped_at).toBeNull();
  } finally {
    await database.client.close();
  }
}, 30000);
