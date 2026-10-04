import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { test, expect } from "bun:test";
import { resetMediaDatabase } from "./media-fixture";
import {
  series,
  seasons,
  videos,
  mediaAssets,
  mediaJobs,
  mediaJobAttempts,
} from "../../src/db/schema";
import { PublicationService } from "../../src/modules/publication/service";
import { CatalogService } from "../../src/modules/catalog/service";
import { CatalogStore } from "../../src/modules/catalog/repository";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { createMediaRepository } from "../../src/modules/media/repository";
import { createMediaCleanup } from "../../src/workers/cleanup";
import { loadStorageEnv } from "../../src/config/storage-env";
import { loadWorkerEnv } from "../../src/config/worker-env";
import type { MultipartStorage } from "../../src/storage/multipart";
const actor = { createdBy: "media-admin", updatedBy: "media-admin" };
test("series remains hidden until it and ready episodes are manually published; counts/next exclude hidden children", async () => {
  const db = await resetMediaDatabase();
  try {
    const parent = crypto.randomUUID(),
      season1 = crypto.randomUUID(),
      season2 = crypto.randomUUID();
    await db.db.insert(series).values({
      id: parent,
      title: "Series",
      synopsis: "Synopsis",
      slug: parent,
      ...actor,
    });
    for (const [id, seasonNumber] of [
      [season1, 1],
      [season2, 2],
    ] as const)
      await db.db
        .insert(seasons)
        .values({ id, seriesId: parent, seasonNumber, ...actor });
    async function ready(
      ownerId: string,
      ownerType: "video" | "series",
      kind: "source" | "poster",
    ) {
      const id = crypto.randomUUID(),
        job = crypto.randomUUID(),
        prefix = "outputs/" + id + "/" + job + "/" + crypto.randomUUID() + "/";
      await db.db.insert(mediaAssets).values({
        id,
        ...(ownerType === "video"
          ? { videoId: ownerId }
          : { seriesId: ownerId }),
        kind,
        provider: "minio",
        bucket: "vertical-movie-app-media-test",
        objectKey: "sources/" + id + "/original",
        state: "uploaded",
        sizeBytes: 100n,
        contentType: kind === "source" ? "video/mp4" : "image/png",
        createdBy: "media-admin",
      });
      await db.db.insert(mediaJobs).values({
        id: job,
        assetId: id,
        generation: 1,
        kind,
        state: "succeeded",
        outputPrefix: prefix,
        outputFiles:
          kind === "source"
            ? [
                "master.m3u8",
                "0/index.m3u8",
                "0/init_0.mp4",
                "0/segment_000000.m4s",
              ]
            : ["poster.webp"],
        finishedAt: new Date(),
      });
      await db.client`UPDATE media_assets SET state='ready',ready_job_id=${job}::uuid,sha256=${"a".repeat(64)},facts=${JSON.stringify(kind === "source" ? { durationMs: 600000, width: 1080, height: 1920 } : { width: 1080, height: 1920, codec: "webp" })}::text::jsonb,verified_ready_at=now() WHERE id=${id}::uuid`;
      if (ownerType === "series")
        await db.client`UPDATE series SET poster_asset_id=${id}::uuid WHERE id=${ownerId}::uuid`;
      else if (kind === "source")
        await db.client`UPDATE videos SET source_asset_id=${id}::uuid WHERE id=${ownerId}::uuid`;
      else
        await db.client`UPDATE videos SET poster_asset_id=${id}::uuid WHERE id=${ownerId}::uuid`;
      return id;
    }
    await ready(parent, "series", "poster");
    const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    for (let i = 0; i < ids.length; i++) {
      await db.db.insert(videos).values({
        id: ids[i],
        kind: "episode",
        title: "Episode " + i,
        synopsis: "Synopsis",
        slug: ids[i],
        seasonId: i === 2 ? season2 : season1,
        episodeNumber: i === 2 ? 1 : i + 1,
        rightsConfirmedAt: new Date(),
        rightsConfirmedBy: "media-admin",
        ...actor,
      });
      await ready(ids[i], "video", "source");
      await ready(ids[i], "video", "poster");
    }
    const catalog = new CatalogService(new CatalogStore(db.db)),
      publish = new PublicationService(db.db, catalog.invalidate);
    await expect(
      publish.publish(
        "series",
        parent,
        { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
        "media-admin",
      ),
    ).rejects.toMatchObject({ code: "PUBLICATION_NOT_READY" });
    for (const id of [ids[0], ids[2]])
      await publish.publish(
        "video",
        id,
        { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
        "media-admin",
      );
    expect((await catalog.list({})).items).toHaveLength(0);
    await publish.publish(
      "series",
      parent,
      { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
      "media-admin",
    );
    expect((await catalog.list({})).items).toHaveLength(2);
    expect((await catalog.seriesDetail(parent)).playableEpisodeCount).toBe(2);
    expect((await catalog.next(ids[0])).id).toBe(ids[2]);
    const seriesService = new SeriesService(
      createSeriesRepository(db.db),
      undefined,
      catalog.invalidate,
    );
    await seriesService.update(
      parent,
      { expectedVersion: 2, synopsis: null },
      "media-admin",
    );
    expect((await catalog.list({})).items).toHaveLength(0);
    await seriesService.update(
      parent,
      { expectedVersion: 3, synopsis: "Restored synopsis" },
      "media-admin",
    );
    expect((await catalog.list({})).items).toHaveLength(2);
    const svc = new VideosService(
      createVideosRepository(db.db),
      undefined,
      catalog.invalidate,
    );
    await svc.archive(ids[2], 2, "media-admin");
    expect((await catalog.seriesDetail(parent)).playableEpisodeCount).toBe(1);
    await svc.archive(ids[0], 2, "media-admin");
    expect((await catalog.series()).items).toHaveLength(0);
    expect(
      (
        await db.client`SELECT publication_status FROM series WHERE id=${parent}::uuid`
      )[0].publication_status,
    ).toBe("published");
  } finally {
    await db.client.close();
  }
}, 30000);
test("original GC waits seven days, preserves archived owners and recovers deletion claims idempotently", async () => {
  const db = await resetMediaDatabase();
  try {
    const clock = new Date(),
      repo = createMediaRepository(db.db),
      deleted: string[] = [];
    const profile = loadStorageEnv({
      STORAGE_PROVIDER: "minio",
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "vertical-movie-app-media-test",
      S3_ACCESS_KEY_ID: "test",
      S3_SECRET_ACCESS_KEY: "test",
    });
    const storage = {
      remove: async (key: string) => {
        deleted.push(key);
      },
      listKeys: async () => [],
    } as unknown as MultipartStorage;
    const gc = createMediaCleanup({
      client: db.client,
      repo,
      storage,
      profile,
      workerEnv: loadWorkerEnv({
        MEDIA_WORKER_WORKDIR: "/var/tmp/nonexistent-media-proof",
      }),
      now: () => clock,
    });
    const entries = [];
    for (const days of [6, 7, 8]) {
      const video = crypto.randomUUID(),
        asset = crypto.randomUUID();
      await db.db.insert(videos).values({
        id: video,
        kind: "movie",
        title: "Retention",
        slug: video,
        ...actor,
        ...(days === 8
          ? { publicationStatus: "archived" as const, archivedAt: clock }
          : {}),
      });
      await db.db.insert(mediaAssets).values({
        id: asset,
        videoId: video,
        kind: "source",
        provider: "minio",
        bucket: profile.bucket,
        objectKey: "sources/" + asset + "/original",
        sizeBytes: 100n,
        contentType: "video/mp4",
        state: "uploaded",
        createdBy: "media-admin",
        verifiedReadyAt: new Date(clock.getTime() - days * 86400000),
        facts: { durationMs: 1000 },
        sha256: "a".repeat(64),
      });
      entries.push(asset);
    }
    expect((await gc()).originals).toBe(1);
    expect(deleted).toHaveLength(1);
    expect((await repo.store.asset(entries[1]))?.deletedAt).not.toBeNull();
    expect((await repo.store.asset(entries[0]))?.deletedAt).toBeNull();
    expect((await repo.store.asset(entries[2]))?.deletedAt).toBeNull();
    const token = crypto.randomUUID();
    await db.client`UPDATE media_assets SET deletion_token=${token}::uuid,deletion_claimed_at=now() WHERE id=${entries[2]}::uuid`;
    expect((await gc()).originals).toBe(1);
    expect((await repo.store.asset(entries[2]))?.deletedAt).not.toBeNull();
    expect((await gc()).originals).toBe(0);
  } finally {
    await db.client.close();
  }
}, 30000);

test("partial GC waits 24h, skips active/successful attempts and retries incomplete deletion", async () => {
  const db = await resetMediaDatabase();
  try {
    const clock = new Date(),
      repo = createMediaRepository(db.db),
      profile = loadStorageEnv({
        STORAGE_PROVIDER: "minio",
        S3_ENDPOINT: "http://localhost:9000",
        S3_REGION: "us-east-1",
        S3_BUCKET: "vertical-movie-app-media-test",
        S3_ACCESS_KEY_ID: "test",
        S3_SECRET_ACCESS_KEY: "test",
      }),
      known = new Set<string>(),
      listed: string[] = [];
    let failed = false;
    const storage = {
      listKeys: async (prefix: string) => {
        listed.push(prefix);
        return [...known].filter((k) => k.startsWith(prefix));
      },
      remove: async (key: string) => {
        if (!failed && key.endsWith("index.m3u8")) {
          failed = true;
          throw new Error("Transient deletion");
        }
        known.delete(key);
      },
    } as unknown as MultipartStorage;
    let eligibleToken = "";
    for (const [state, hours] of [
      ["retry", 25],
      ["retry", 23],
      ["running", 25],
      ["succeeded", 25],
    ] as const) {
      const video = crypto.randomUUID(),
        asset = crypto.randomUUID(),
        job = crypto.randomUUID(),
        token = crypto.randomUUID(),
        prefix = "outputs/" + asset + "/" + job + "/" + token + "/";
      await db.db.insert(videos).values({
        id: video,
        kind: "movie",
        title: "Partial proof",
        slug: video,
        ...actor,
      });
      await db.db.insert(mediaAssets).values({
        id: asset,
        videoId: video,
        kind: "source",
        provider: "minio",
        bucket: profile.bucket,
        objectKey: "sources/" + asset + "/original",
        sizeBytes: 100n,
        contentType: "video/mp4",
        state: "uploaded",
        createdBy: "media-admin",
      });
      await db.db.insert(mediaJobs).values({
        id: job,
        assetId: asset,
        generation: 1,
        kind: "source",
        state,
        attempts: 1,
        ...(state === "running"
          ? {
              leaseToken: token,
              leaseUntil: new Date(clock.getTime() + 120000),
            }
          : {}),
        ...(state === "succeeded"
          ? {
              outputPrefix: prefix,
              outputFiles: ["master.m3u8"],
              finishedAt: clock,
            }
          : {}),
      });
      await db.db.insert(mediaJobAttempts).values({
        token,
        jobId: job,
        attempt: 1,
        outputPrefix: prefix,
        stoppedAt: new Date(clock.getTime() - hours * 3600000),
      });
      if (state === "retry" && hours === 25) {
        eligibleToken = token;
        known.add(prefix + "partial.m4s");
        known.add(prefix + "index.m3u8");
      }
    }
    const gc = createMediaCleanup({
      client: db.client,
      repo,
      storage,
      profile,
      workerEnv: loadWorkerEnv({
        MEDIA_WORKER_WORKDIR: "/var/tmp/nonexistent-media-partial-proof",
      }),
      now: () => clock,
    });
    expect((await gc()).partials).toBe(0);
    expect(known.size).toBe(1);
    expect(
      (
        await db.client`SELECT cleaned_at FROM media_job_attempts WHERE token=${eligibleToken}::uuid`
      )[0].cleaned_at,
    ).toBeNull();
    expect((await gc()).partials).toBe(1);
    expect(known.size).toBe(0);
    expect(
      (
        await db.client`SELECT cleaned_at FROM media_job_attempts WHERE token=${eligibleToken}::uuid`
      )[0].cleaned_at,
    ).not.toBeNull();
    expect(new Set(listed).size).toBe(1);
    expect((await gc()).partials).toBe(0);
  } finally {
    await db.client.close();
  }
}, 30000);
