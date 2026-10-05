import { proveBrowserPlayback } from "./media-playback-fixture";
import { createHash } from "node:crypto";
import { PublicationService } from "../../src/modules/publication/service";
import { PlaybackService } from "../../src/modules/playback/service";
import { CatalogService } from "../../src/modules/catalog/service";
import { CatalogStore } from "../../src/modules/catalog/repository";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { createApp } from "../../src/app";
import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  ListMultipartUploadsCommand,
} from "@aws-sdk/client-s3";
import { resetMediaDatabase } from "./media-fixture";
import { loadStorageEnv } from "../../src/config/storage-env";
import { loadWorkerEnv } from "../../src/config/worker-env";
import { createStorageClient } from "../../src/storage/s3";
import { createMultipartStorage } from "../../src/storage/multipart";
import { createMediaRepository } from "../../src/modules/media/repository";
import { MediaService } from "../../src/modules/media/service";
import { createMediaQueue } from "../../src/workers/queue";
import { createJobRunner } from "../../src/workers/runner";
import { runMediaProcess } from "../../src/workers/process";
import { videos, series, seasons } from "../../src/db/schema";
const browserProof = Bun.env.MEDIA_PLAYBACK_BROWSER_PROOF === "1";
const longSeconds = Number(Bun.env.MEDIA_PLAYBACK_LONG_DURATION_SECONDS ?? 0);
if (![0, 600, 1800].includes(longSeconds))
  throw new Error("Long fixture duration must be 600 or 1800");
const durationMs = longSeconds
  ? longSeconds * 1000
  : browserProof
    ? 12000
    : 2000;
const qualityProof = Bun.env.MEDIA_PLAYBACK_QUALITY_PROOF === "1";
const endpoint = Bun.env.MEDIA_STORAGE_TEST_ENDPOINT;
if (
  endpoint !== "http://localhost:9000" &&
  endpoint !== "http://127.0.0.1:9000"
)
  throw new Error("Explicit loopback test storage required.");
test(
  "multipart completion atomically enqueues one durable job; claimed worker verifies full HLS before ready",
  async () => {
    const database = await resetMediaDatabase(),
      bucket =
        "vertical-movie-app-media-test-" + crypto.randomUUID().slice(0, 8),
      config = loadStorageEnv({
        STORAGE_PROVIDER: "minio",
        S3_ENDPOINT: endpoint,
        S3_REGION: "us-east-1",
        S3_BUCKET: bucket,
        S3_ACCESS_KEY_ID: Bun.env.MEDIA_STORAGE_TEST_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: Bun.env.MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY,
      }),
      native = createStorageClient(config),
      storage = createMultipartStorage(config),
      sdk = new S3Client({
        endpoint,
        region: config.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
      dir = await mkdtemp("/var/tmp/vertical-movie-worker-proof-"),
      workerEnv = loadWorkerEnv({
        MEDIA_WORKER_WORKDIR: join(dir, "work"),
        MEDIA_WORKER_MIN_FREE_BYTES: "1",
      }),
      repo = createMediaRepository(database.db),
      service = new MediaService(repo, storage, config),
      queue = createMediaQueue(database.client, workerEnv);
    let created = false;
    try {
      await sdk.send(new CreateBucketCommand({ Bucket: bucket }));
      created = true;
      const source = join(dir, "source.mp4");
      await runMediaProcess(
        [
          "ffmpeg",
          "-v",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          longSeconds
            ? "color=blue:size=1080x1920:rate=24"
            : qualityProof
              ? "testsrc2=size=1080x1920:rate=24"
              : "testsrc2=size=486x864:rate=24",
          "-t",
          String(durationMs / 1000),
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-threads",
          "1",
          source,
        ],
        { timeoutSeconds: longSeconds ? Math.max(900, longSeconds * 2) : 30 },
      );
      const id = crypto.randomUUID();
      const parentId = longSeconds === 600 ? crypto.randomUUID() : undefined,
        seasonId = parentId ? crypto.randomUUID() : undefined;
      if (parentId && seasonId) {
        await database.db.insert(series).values({
          id: parentId,
          title: "Full episode series",
          synopsis: "Fixture parent",
          slug: parentId,
          createdBy: "media-admin",
          updatedBy: "media-admin",
        });
        await database.db.insert(seasons).values({
          id: seasonId,
          seriesId: parentId,
          seasonNumber: 1,
          createdBy: "media-admin",
          updatedBy: "media-admin",
        });
      }
      await database.db.insert(videos).values({
        id,
        kind: parentId ? "episode" : "movie",
        seasonId: seasonId ?? null,
        episodeNumber: parentId ? 1 : null,
        title: "Worker movie",
        synopsis: "Verified test movie",
        rightsConfirmedAt: new Date(),
        rightsConfirmedBy: "media-admin",
        slug: id,
        createdBy: "media-admin",
        updatedBy: "media-admin",
      });
      async function putSource(
        session: Awaited<ReturnType<MediaService["initiate"]>>,
      ) {
        for (let n = 1; n <= session.partCount; n++) {
          const signed = await service.part(session.id, n, "media-admin");
          const offset = (n - 1) * Number(session.partSizeBytes);
          const response = await fetch(signed.url!, {
            method: "PUT",
            body: Bun.file(source).slice(
              offset,
              Math.min(
                Bun.file(source).size,
                offset + Number(session.partSizeBytes),
              ),
            ),
          });
          expect(response.ok).toBe(true);
        }
      }
      const session = await service.initiate(
        {
          ownerType: "video",
          ownerId: id,
          kind: "source",
          filename: "movie.mp4",
          contentType: "video/mp4",
          sizeBytes: String(Bun.file(source).size),
          idempotencyKey: crypto.randomUUID(),
          expectedSha256: createHash("sha256")
            .update(new Uint8Array(await Bun.file(source).arrayBuffer()))
            .digest("hex"),
        },
        "media-admin",
      );
      await putSource(session);
      expect(
        (await service.status(session.id, "media-admin")).uploadedBytes,
      ).toBe(String(Bun.file(source).size));
      expect(
        (await service.complete(session.id, "media-admin")).uploadedBytes,
      ).toBe(String(Bun.file(source).size));
      await service.complete(session.id, "media-admin");
      expect(
        (await database.client`SELECT count(*)::int AS n FROM media_jobs`)[0].n,
      ).toBe(1);
      const claims = await Promise.all([queue.claim(), queue.claim()]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      const job = claims.find(Boolean)!;
      expect(
        await queue.heartbeat({ ...job, leaseToken: crypto.randomUUID() }, 0),
      ).toBe(false);
      const run = createJobRunner({
        repo,
        queue,
        native,
        storage,
        storageEnv: config,
        workerEnv,
      });
      expect(await run(job)).toEqual({ state: "succeeded" });
      const asset = await repo.store.asset(session.assetId);
      expect(asset?.state).toBe("ready");
      expect(asset?.sha256).toHaveLength(64);
      expect(asset?.facts?.durationMs).toBe(durationMs);
      expect(
        (
          await database.client`SELECT jsonb_typeof(facts) AS type FROM media_assets WHERE id=${session.assetId}::uuid`
        )[0].type,
      ).toBe("object");
      const ready = await repo.store.job(job.id);
      expect(ready?.state).toBe("succeeded");
      expect(
        (await service.status(session.id, "media-admin")).processing.jobState,
      ).toBe("succeeded");
      expect(
        (
          await database.client`SELECT jsonb_typeof(output_files) AS type FROM media_jobs WHERE id=${job.id}::uuid`
        )[0].type,
      ).toBe("array");
      expect(ready?.outputFiles?.length).toBe(
        (qualityProof ? 3 : 1) * (Math.ceil(durationMs / 6000) + 2) + 1,
      );
      expect(ready?.outputPrefix).toBe(job.outputPrefix);
      expect(
        (
          await database.client`SELECT publication_status FROM videos WHERE id=${id}`
        )[0].publication_status,
      ).toBe("draft");
      const master = await native.file(job.outputPrefix + "master.m3u8").text();
      expect(master).toContain("#EXT-X-STREAM-INF");
      const segment = ready!.outputFiles!.find((f) => f.endsWith(".m4s"))!;
      const get = native.presign(job.outputPrefix + segment, { expiresIn: 60 });
      const range = await fetch(get, { headers: { Range: "bytes=0-63" } });
      expect(range.status).toBe(206);
      expect((await range.arrayBuffer()).byteLength).toBe(64);
      expect(range.headers.get("cache-control")).toBe("private, no-store");
      expect(
        (
          await fetch(
            endpoint + "/" + bucket + "/" + job.outputPrefix + segment,
          )
        ).status,
      ).toBe(403);
      const catalogStore = new CatalogStore(database.db),
        catalog = new CatalogService(catalogStore),
        publication = new PublicationService(database.db, catalog.invalidate),
        playback = new PlaybackService(
          catalogStore,
          native,
          "http://localhost:" +
            Number(Bun.env.MEDIA_PLAYBACK_BROWSER_PORT ?? 3000) +
            "/api",
          config,
        ),
        videoService = new VideosService(
          createVideosRepository(database.db),
          undefined,
          catalog.invalidate,
        );
      await expect(
        publication.publish(
          "video",
          id,
          { expectedVersion: 2, idempotencyKey: crypto.randomUUID() },
          "media-admin",
        ),
      ).rejects.toMatchObject({ code: "PUBLICATION_NOT_READY" });
      const posterFile = join(dir, "poster.png");
      await runMediaProcess(
        [
          "ffmpeg",
          "-v",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          "color=blue:size=1080x1920",
          "-frames:v",
          "1",
          posterFile,
        ],
        { timeoutSeconds: 30 },
      );
      const posterSession = await service.initiate(
        {
          ownerType: "video",
          ownerId: id,
          kind: "poster",
          filename: "poster.png",
          contentType: "image/png",
          sizeBytes: String(Bun.file(posterFile).size),
          idempotencyKey: crypto.randomUUID(),
        },
        "media-admin",
      );
      const posterPart = await service.part(posterSession.id, 1, "media-admin");
      expect(
        (
          await fetch(posterPart.url!, {
            method: "PUT",
            body: Bun.file(posterFile),
          })
        ).ok,
      ).toBe(true);
      await service.complete(posterSession.id, "media-admin");
      const posterClaim = (await queue.claim())!;
      expect(posterClaim.kind).toBe("poster");
      expect(await run(posterClaim)).toEqual({ state: "succeeded" });
      if (parentId) {
        const parentPoster = await service.initiate(
          {
            ownerType: "series",
            ownerId: parentId,
            kind: "poster",
            filename: "poster.png",
            contentType: "image/png",
            sizeBytes: String(Bun.file(posterFile).size),
            idempotencyKey: crypto.randomUUID(),
          },
          "media-admin",
        );
        const url = await service.part(parentPoster.id, 1, "media-admin");
        expect(
          (await fetch(url.url!, { method: "PUT", body: Bun.file(posterFile) }))
            .ok,
        ).toBe(true);
        await service.complete(parentPoster.id, "media-admin");
        expect(await run((await queue.claim())!)).toEqual({
          state: "succeeded",
        });
      }
      const app = createApp({
        catalogService: catalog,
        publicationService: publication,
        playbackService: playback,
        videosService: videoService,
        getSession: async () => null,
      });
      expect(
        (
          await app.handle(
            new Request("http://localhost/videos/" + id + "/playback"),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await app.handle(
            new Request("http://localhost/admin/videos/" + id + "/playback"),
          )
        ).status,
      ).toBe(401);
      expect((await playback.info(id, true)).masterUrl).toContain(
        "/admin/videos/",
      );
      // Successful HLS provenance remains usable after the original object is tombstoned.
      await storage.remove(asset!.objectKey);
      await database.client`UPDATE media_assets SET deleted_at=now() WHERE id=${asset!.id}::uuid`;
      const publishRequest = {
          expectedVersion: 3,
          idempotencyKey: crypto.randomUUID(),
        },
        published = await publication.publish(
          "video",
          id,
          publishRequest,
          "media-admin",
        );
      expect(published.rowVersion).toBe(4);
      expect(
        await publication.publish("video", id, publishRequest, "media-admin"),
      ).toEqual(published);
      await expect(
        publication.publish(
          "video",
          id,
          { ...publishRequest, expectedVersion: 4 },
          "media-admin",
        ),
      ).rejects.toMatchObject({ code: "PUBLICATION_IDEMPOTENCY_CONFLICT" });
      if (parentId) {
        expect((await catalog.list({})).items).toHaveLength(0);
        await publication.publish(
          "series",
          parentId,
          { expectedVersion: 2, idempotencyKey: crypto.randomUUID() },
          "media-admin",
        );
      }
      expect((await catalog.list({})).items).toHaveLength(1);
      if (browserProof) await proveBrowserPlayback(app, id);
      const dto = await playback.info(id);
      expect(Date.parse(dto.expiresAt) - Date.now()).toBeLessThanOrEqual(
        durationMs * 2,
      );
      const playlist = await playback.playlist(id, undefined);
      expect(playlist.headers.get("cache-control")).toBe("private, no-store");
      expect(await playlist.text()).toContain(
        "/api/playback/videos/" + id + "/variants/0",
      );
      const variant = await playback.playlist(id, "0");
      const variantText = await variant.text();
      expect(variantText).not.toContain("sources/");
      const payload = variantText
        .split(/\r?\n/)
        .find((l) => l.startsWith("http"))!;
      expect((await fetch(payload)).status).toBe(200);
      const archived = await videoService.archive(id, 4, "media-admin");
      expect(archived.publicationStatus).toBe("archived");
      expect(archived.sourceAvailability).toBe("deleted");
      expect((await catalog.list({})).items).toHaveLength(0);
      expect(
        (
          await app.handle(
            new Request("http://localhost/videos/" + id + "/playback"),
          )
        ).status,
      ).toBe(404);
      expect((await fetch(payload)).status).toBe(200);
      const extra = crypto.randomUUID();
      await database.db.insert(videos).values({
        id: extra,
        kind: "movie",
        title: "Recovery fixture",
        slug: extra,
        createdBy: "media-admin",
        updatedBy: "media-admin",
      });
      const upload2 = await service.initiate(
        {
          ownerType: "video",
          ownerId: extra,
          kind: "source",
          filename: "movie.mp4",
          contentType: "video/mp4",
          sizeBytes: String(Bun.file(source).size),
          idempotencyKey: crypto.randomUUID(),
        },
        "media-admin",
      );
      await putSource(upload2);
      await service.complete(upload2.id, "media-admin");
      const stale = (await queue.claim())!;
      await database.client`UPDATE media_jobs SET lease_until=now()-interval '1 second' WHERE id=${stale.id}::uuid`;
      expect(await queue.heartbeat(stale, 1)).toBe(false);
      expect((await queue.recover()).recovered).toBe(1);
      let row = await repo.store.job(stale.id);
      expect(row?.state).toBe("retry");
      expect(row?.failures).toBe(1);
      expect(await queue.claim()).toBeUndefined();
      await database.client`UPDATE media_jobs SET run_after=now() WHERE id=${stale.id}::uuid`;
      const retry = (await queue.claim())!;
      expect(retry.leaseToken).not.toBe(stale.leaseToken);
      expect(await queue.fail(stale, "STALE_FAILURE")).toBe(false);
      expect(await queue.fail(retry, "TRANSIENT")).toBe(true);
      row = await repo.store.job(stale.id);
      expect(row?.failures).toBe(2);
      await database.client`UPDATE media_jobs SET run_after=now() WHERE id=${stale.id}::uuid`;
      const last = (await queue.claim())!;
      await queue.fail(last, "TRANSIENT");
      expect((await repo.store.job(stale.id))?.state).toBe("failed");
      expect((await repo.store.asset(upload2.assetId))?.state).toBe("failed");
      const wrongOwner = crypto.randomUUID();
      await database.db.insert(videos).values({
        id: wrongOwner,
        kind: "movie",
        title: "Wrong file",
        slug: wrongOwner,
        createdBy: "media-admin",
        updatedBy: "media-admin",
      });
      const wrong = await service.initiate(
        {
          ownerType: "video",
          ownerId: wrongOwner,
          kind: "source",
          filename: "movie.mp4",
          contentType: "video/mp4",
          sizeBytes: String(Bun.file(source).size),
          idempotencyKey: crypto.randomUUID(),
          expectedSha256: "0".repeat(64),
        },
        "media-admin",
      );
      await putSource(wrong);
      await service.complete(wrong.id, "media-admin");
      const wrongJob = (await queue.claim())!;
      const beforeProbe = createJobRunner({
        repo,
        queue,
        native,
        storage,
        storageEnv: config,
        workerEnv: {
          ...workerEnv,
          ffprobe: "missing-proof-ffprobe",
          ffmpeg: "missing-proof-ffmpeg",
        },
      });
      expect(await beforeProbe(wrongJob)).toEqual({
        state: "failed",
        code: "MEDIA_SOURCE_CHANGED",
      });
      expect((await repo.store.job(wrongJob.id))?.state).toBe("failed");
      const rejected = await repo.store.asset(wrong.assetId);
      expect(rejected?.state).toBe("failed");
      expect(rejected?.readyJobId).toBeNull();
      expect(rejected?.facts).toBeNull();
      expect(await storage.listKeys(wrongJob.outputPrefix)).toEqual([]);
      expect(
        (
          await service.ownerMedia(
            { ownerType: "video", ownerId: wrongOwner },
            "media-admin",
          )
        ).canPreview,
      ).toBe(false);
    } finally {
      if (created) {
        const pending = await sdk.send(
          new ListMultipartUploadsCommand({ Bucket: bucket }),
        );
        for (const u of pending.Uploads ?? [])
          if (u.Key && u.UploadId) await storage.abort(u.Key, u.UploadId);
        const objects = await sdk.send(
          new ListObjectsV2Command({ Bucket: bucket }),
        );
        for (const o of objects.Contents ?? [])
          if (o.Key) await storage.remove(o.Key);
        await sdk.send(new DeleteBucketCommand({ Bucket: bucket }));
      }
      storage.close();
      sdk.destroy();
      await database.client.close();
      if (!dir.startsWith("/var/tmp/vertical-movie-worker-proof-"))
        throw new Error("Unsafe proof cleanup");
      await rm(dir, { recursive: true, force: true });
    }
  },
  longSeconds ? 1800000 : 240000,
);
