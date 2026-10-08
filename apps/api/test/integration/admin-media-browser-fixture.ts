import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { resetMediaDatabase, mediaTestUrl } from "./media-fixture";
import { createApp } from "../../src/app";
import type { RequireAdminDependencies } from "../../src/modules/auth/admin/guard";
import { loadStorageEnv } from "../../src/config/storage-env";
import { createStorageClient } from "../../src/storage/s3";
import { createMultipartStorage } from "../../src/storage/multipart";
import { MediaService } from "../../src/modules/media/service";
import { PosterProcessingService } from "../../src/modules/media/poster-processing";
import { loadPosterEnv } from "../../src/config/poster-env";
import { createMediaRepository } from "../../src/modules/media/repository";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { ContentPageService } from "../../src/modules/content/service";
import { createContentPageRepository } from "../../src/modules/content/repository";
import { GenresService } from "../../src/modules/genres/service";
import { createGenresRepository } from "../../src/modules/genres/repository";
import { PlaybackService } from "../../src/modules/playback/service";
import { CatalogStore } from "../../src/modules/catalog/repository";
import { CatalogHomeStore } from "../../src/modules/catalog/home-repository";
import { PublicContentStore } from "../../src/modules/catalog/content-repository";
import { CatalogService } from "../../src/modules/catalog/service";
import { PublicationService } from "../../src/modules/publication/service";
import { runMediaProcess } from "../../src/workers/process";
import { mediaAssets, videos, series } from "../../src/db/schema";

// Only the guarded dedicated DB and a random private bucket are modified.
// Authentication is injected by the existing auth harness; all media/content I/O is real.
export async function createAdminMediaBrowserFixture(
  getSession: RequireAdminDependencies["getSession"],
) {
  const endpoint = Bun.env.MEDIA_STORAGE_TEST_ENDPOINT;
  if (
    endpoint !== "http://localhost:9000" &&
    endpoint !== "http://127.0.0.1:9000"
  )
    throw Error("Loopback MinIO required");
  const database = await resetMediaDatabase();
  await database.client`UPDATE "user" SET id='browser-admin',name='Browser Admin',email='browser@example.test' WHERE id='media-admin'`;
  const config = loadStorageEnv({
    STORAGE_PROVIDER: "minio",
    S3_ENDPOINT: endpoint,
    S3_REGION: "us-east-1",
    S3_BUCKET:
      "vertical-movie-app-media-test-" + crypto.randomUUID().slice(0, 8),
    S3_ACCESS_KEY_ID: Bun.env.MEDIA_STORAGE_TEST_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: Bun.env.MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY,
  });
  const sdk = new S3Client({
    endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const storage = createMultipartStorage(config),
    native = createStorageClient(config),
    repo = createMediaRepository(database.db),
    mediaService = new MediaService(
      repo,
      storage,
      config,
      undefined,
      new PosterProcessingService(
        repo,
        storage,
        native,
        config,
        loadPosterEnv(),
      ),
    );
  const storageProofEnabled = Bun.env.MEDIA_BROWSER_STORAGE !== "disabled";
  const dir = resolve(
      import.meta.dir,
      "../../../../.turbo/admin-media-upload-implementation/browser-" +
        crypto.randomUUID(),
    ),
    screenshotDir = resolve(
      import.meta.dir,
      Bun.env.AUTH_BROWSER_PHASE === "publication"
        ? "../../../../.turbo/admin-publication-execution/browser"
        : "../../../../.turbo/admin-cover-processing/acov-007",
    ),
    source = join(dir, "source.mp4"),
    poster = join(dir, "cover.jpg");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const catalogStore = new CatalogStore(database.db),
    catalogService = new CatalogService(
      catalogStore,
      undefined,
      new CatalogHomeStore(database.db),
      new PublicContentStore(database.db),
    ),
    videoService = new VideosService(
      createVideosRepository(database.db),
      undefined,
      catalogService.invalidate,
    ),
    seriesService = new SeriesService(
      createSeriesRepository(database.db),
      undefined,
      catalogService.invalidate,
    );
  let created = false;
  const close = async () => {
    if (created) {
      // Pending keys are known from the dedicated DB, not guessed from the app bucket.
      const uploads =
        await database.client`SELECT staging_key,upload_id FROM upload_sessions WHERE upload_id IS NOT NULL AND status IN ('initializing','pending','completing','aborting')`;
      for (const row of uploads)
        await storage.abort(row.staging_key, row.upload_id).catch(() => {});
      for (const key of await storage.listKeys("uploads/"))
        await native.delete(key);
      for (const prefix of ["sources/", "outputs/"])
        for (const key of await storage.listKeys(prefix))
          await native.delete(key);
      await sdk.send(new DeleteBucketCommand({ Bucket: config.bucket }));
    }
    sdk.destroy();
    await database.client.close();
    await rm(dir, { recursive: true, force: true });
  };
  try {
    if (storageProofEnabled) {
      await sdk.send(new CreateBucketCommand({ Bucket: config.bucket }));
      created = true;
    }
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=486x864:rate=24",
        "-t",
        "12",
        "-c:v",
        "libx264",
        "-crf",
        "10",
        "-preset",
        "ultrafast",
        "-threads",
        "1",
        source,
      ],
      { timeoutSeconds: 60 },
    );
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=2160x3840",
        "-vf",
        "drawbox=x=1080:y=0:w=1080:h=3840:color=blue:t=fill",
        "-frames:v",
        "1",
        "-threads",
        "1",
        poster,
      ],
      { timeoutSeconds: 30 },
    );
    const ids: Record<string, string> = {};
    for (const kind of ["film", "standalone", "series"] as const) {
      for (const state of ["Draft", "Published", "Archived"] as const) {
        const row =
          kind === "series"
            ? (
                await seriesService.create(
                  { title: `Media ${kind} ${state}` },
                  "browser-admin",
                )
              ).series
            : await videoService.create(
                {
                  title: `Media ${kind} ${state}`,
                  kind: kind === "film" ? "movie" : "standalone",
                  rightsConfirmed: true,
                },
                "browser-admin",
              );
        ids[kind + state] = row.id;
        if (state === "Published") {
          const values = {
            publicationStatus: "published" as const,
            firstPublishedAt: new Date(),
            publishedAt: new Date(),
          };
          if (kind === "series")
            await database.db
              .update(series)
              .set(values)
              .where(eq(series.id, row.id));
          else
            await database.db
              .update(videos)
              .set(values)
              .where(eq(videos.id, row.id));
        }
        if (state === "Archived") {
          if (kind === "series")
            await seriesService.archive(row.id, 1, "browser-admin");
          else await videoService.archive(row.id, 1, "browser-admin");
        }
      }
    }
    if (Bun.env.AUTH_BROWSER_PHASE === "publication") {
      for (let i = 0; i < 16; i++)
        await videoService.create(
          {
            title: `Publication list ${i + 1}`,
            kind: "movie",
            rightsConfirmed: true,
          },
          "browser-admin",
        );
    }
    const makeApp = (playbackBase = "/api") =>
      createApp({
        getSession,
        mediaService,
        videosService: videoService,
        seriesService,
        contentPageService: new ContentPageService(
          createContentPageRepository(database.db),
        ),
        genresService: new GenresService(createGenresRepository(database.db)),
        catalogService,
        publicationService: new PublicationService(
          database.db,
          catalogService.invalidate,
        ),
        playbackService: new PlaybackService(
          new CatalogStore(database.db),
          native,
          playbackBase,
          config,
        ),
      }).compile();
    let app = makeApp();
    const traces: Array<{
      path: string;
      method: string;
      status: number;
      partNumber?: number;
    }> = [];
    let failureStatus = 0,
      processPosterUnavailable = false,
      workerStarts = 0;
    const digest = createHash("sha256");
    for await (const chunk of Bun.file(source).stream()) digest.update(chunk);
    return {
      ids,
      traces,
      files: { source, poster, sourceSize: Bun.file(source).size },
      async proof(options: { verifyPosterObjects?: boolean } = {}) {
        type ProofAsset = {
          id: string;
          owner_id: string;
          kind: string;
          state: string;
          object_key: string;
          size_bytes: string;
          content_type: string;
          sha256: string | null;
          ready_job_id: string | null;
          facts: Record<string, unknown> | null;
          verified_ready_at: Date | null;
        };
        type ProofJob = {
          id: string;
          asset_id: string;
          execution_mode: string;
          state: string;
          attempts: number;
          output_prefix: string | null;
          output_files: string[] | null;
        };
        type ProofAttempt = {
          job_id: string;
          attempt: number;
          stopped_at: Date | null;
          failure_code: string | null;
        };
        const assets =
            (await database.client`SELECT id,coalesce(video_id,series_id) AS owner_id,kind,state,object_key,size_bytes::text AS size_bytes,content_type,sha256,ready_job_id,facts,verified_ready_at FROM media_assets ORDER BY created_at`) as ProofAsset[],
          jobs =
            (await database.client`SELECT id,asset_id,execution_mode,state,attempts,output_prefix,output_files FROM media_jobs ORDER BY created_at`) as ProofJob[],
          attempts =
            (await database.client`SELECT job_id,attempt,stopped_at,failure_code FROM media_job_attempts ORDER BY attempt`) as ProofAttempt[],
          posterObjects = [] as Array<Record<string, unknown>>;
        for (const asset of options.verifyPosterObjects ? assets : []) {
          if (asset.kind !== "poster" || asset.state !== "ready") continue;
          const job = jobs.find((item) => item.id === asset.ready_job_id);
          if (!job?.output_prefix) continue;
          try {
            const outputKey = job.output_prefix + "poster.webp";
            const bytes = new Uint8Array(
                await native.file(outputKey).arrayBuffer(),
              ),
              stat = await storage.stat(outputKey),
              metadata = await new Bun.Image(bytes, {
                maxPixels: 16_777_216,
              }).metadata(),
              outputSha256 = createHash("sha256").update(bytes).digest("hex"),
              unsigned = await fetch(
                `${config.endpoint}/${config.bucket}/${outputKey}`,
              );
            posterObjects.push({
              ownerId: asset.owner_id,
              assetId: asset.id,
              state: asset.state,
              sizeBytes: bytes.byteLength,
              headSizeBytes: stat.sizeBytes,
              contentType: stat.contentType,
              dimensions: [metadata.width, metadata.height],
              webp:
                Buffer.from(bytes).toString("ascii", 0, 4) === "RIFF" &&
                Buffer.from(bytes).toString("ascii", 8, 12) === "WEBP",
              outputSha256,
              inputSha256: asset.sha256,
              factsOutputSha256: asset.facts?.outputSha256,
              outputMatchesReadyJob:
                job.state === "succeeded" &&
                outputKey === job.output_prefix + "poster.webp" &&
                job.output_files?.includes("poster.webp"),
              processingMode: job.execution_mode,
              jobState: job.state,
              attempts: job.attempts,
              attemptRows: attempts.filter((row) => row.job_id === job.id)
                .length,
              unsignedStatus: unsigned.status,
            });
          } catch {
            posterObjects.push({
              ownerId: asset.owner_id,
              assetId: asset.id,
              verificationFailed: true,
            });
          }
        }
        return {
          ids,
          traces,
          workerStarts,
          files: { source, poster, sourceSize: Bun.file(source).size },
          sourceSha256: digest.copy().digest("hex"),
          sessions:
            await database.client`SELECT id,coalesce(video_id,series_id) AS owner_id,kind,status,asset_id,expected_sha256 FROM upload_sessions ORDER BY created_at`,
          assets,
          jobs,
          attempts,
          posterObjects,
          publications:
            await database.client`SELECT id,kind,slug,publication_status,row_version,first_published_at,published_at,archived_at,rights_confirmed_at FROM videos ORDER BY created_at`,
          operations:
            await database.client`SELECT video_id,series_id,action FROM content_operations ORDER BY created_at`,
        };
      },
      async saveCoverScreenshot(name: string, bytes: Uint8Array) {
        if (!/^[a-z0-9-]{1,80}$/.test(name) || bytes.byteLength > 8_000_000)
          throw Error("Invalid cover crop screenshot");
        await mkdir(screenshotDir, { recursive: true, mode: 0o700 });
        const path = join(screenshotDir, name + ".png");
        await writeFile(path, bytes, { mode: 0o600 });
        return path;
      },
      async control(input: {
        failureStatus?: number;
        runJobs?: boolean;
        attachCurrentPoster?: boolean;
        processPosterUnavailable?: boolean;
      }) {
        if (input.failureStatus !== undefined)
          failureStatus = input.failureStatus;
        if (input.processPosterUnavailable !== undefined)
          processPosterUnavailable = input.processPosterUnavailable;
        if (input.attachCurrentPoster) {
          const assetId = crypto.randomUUID();
          await database.db.insert(mediaAssets).values({
            id: assetId,
            videoId: ids.filmDraft,
            seriesId: null,
            kind: "poster",
            provider: config.provider,
            bucket: config.bucket,
            objectKey: `test/${assetId}.webp`,
            state: "ready",
            sizeBytes: 100n,
            contentType: "image/webp",
            sha256: "a".repeat(64),
            facts: { width: 1080, height: 1920 },
            verifiedReadyAt: new Date(),
            createdBy: "browser-admin",
          });
          await database.db
            .update(videos)
            .set({ posterAssetId: assetId })
            .where(eq(videos.id, ids.filmDraft));
        }
        if (input.runJobs) {
          workerStarts += 1;
          // Run the actual worker entry point separately; FFmpeg is outside the HTTP process.
          const worker = Bun.spawn([process.execPath, "src/workers/index.ts"], {
            cwd: resolve(import.meta.dir, "../.."),
            env: {
              ...Bun.env,
              NODE_ENV: "development",
              DATABASE_URL: mediaTestUrl(),
              STORAGE_PROVIDER: "minio",
              S3_ENDPOINT: config.endpoint,
              S3_REGION: config.region,
              S3_BUCKET: config.bucket,
              S3_ACCESS_KEY_ID: config.accessKeyId,
              S3_SECRET_ACCESS_KEY: config.secretAccessKey,
              MEDIA_WORKER_CONCURRENCY: "1",
              MEDIA_JOB_POLL_SECONDS: "1",
              MEDIA_WORKER_MIN_FREE_BYTES: "1",
              MEDIA_WORKER_WORKDIR: join(dir, "work"),
            },
            stdout: "ignore",
            stderr: "ignore",
          });
          try {
            let done = false;
            for (let i = 0; i < 180; i++) {
              const [row] =
                await database.client`SELECT count(*)::int AS n FROM media_jobs WHERE state IN ('queued','running','retry')`;
              if (!row.n) {
                done = true;
                break;
              }
              if (worker.exitCode !== null)
                throw Error("Test worker exited before completion");
              await Bun.sleep(500);
            }
            if (!done)
              throw Error("Test worker did not settle within 90 seconds");
          } finally {
            worker.kill("SIGTERM");
            await worker.exited;
          }
        }
      },
      async handle(request: Request) {
        const path = new URL(request.url).pathname,
          mutation = ["POST", "PATCH"].includes(request.method);
        const input = mutation
          ? await request
              .clone()
              .json()
              .catch(() => null)
          : null;
        const response =
          processPosterUnavailable &&
          request.method === "POST" &&
          path.endsWith("/process-poster")
            ? Response.json(
                {
                  error: {
                    code: "POSTER_PROCESSING_BUSY",
                    message: "Fixture cover processor is temporarily busy.",
                    requestId: crypto.randomUUID(),
                  },
                },
                { status: 503 },
              )
            : failureStatus && mutation
              ? Response.json(
                  {
                    error: {
                      code: "CONTENT_DEPENDENCY_UNAVAILABLE",
                      message: "Fixture unavailable",
                      requestId: crypto.randomUUID(),
                    },
                  },
                  { status: failureStatus },
                )
              : await app.handle(request);
        if (mutation)
          traces.push({
            path,
            method: request.method,
            status: response.status,
            partNumber: input?.partNumber,
          });
        return response;
      },
      setWebOrigin: (origin: string) => {
        if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
          throw Error("Loopback web origin required");
        app = makeApp(origin + "/api");
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
