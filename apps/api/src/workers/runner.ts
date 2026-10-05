import { mkdir, mkdtemp, rm, statfs } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import type { S3Client } from "bun";
import type { StorageEnv } from "../config/storage-env";
import type { WorkerEnv } from "../config/worker-env";
import type { MultipartStorage } from "../storage/multipart";
import type { MediaRepository } from "../modules/media/repository";
import type { MediaQueue, JobClaim } from "./queue";
import { MediaProcessError } from "./process";
import { probe, videoFacts, verifyEbml } from "./probe";
import { transcodeHls, transcodePoster } from "./transcode";
const mime = (file: string) =>
  file.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : file.endsWith(".mp4")
      ? "video/mp4"
      : file.endsWith(".m4s")
        ? "video/iso.segment"
        : file.endsWith(".webp")
          ? "image/webp"
          : "application/octet-stream";
export function createJobRunner({
  repo,
  queue,
  native,
  storage,
  storageEnv,
  workerEnv,
}: {
  repo: MediaRepository;
  queue: MediaQueue;
  native: S3Client;
  storage: MultipartStorage;
  storageEnv: StorageEnv;
  workerEnv: WorkerEnv;
}) {
  return async function run(job: JobClaim, shutdown?: AbortSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    shutdown?.addEventListener("abort", abort, { once: true });
    if (shutdown?.aborted) abort();
    let progress = 0,
      heartbeatRunning = false,
      dir: string | undefined;
    const heartbeat = setInterval(async () => {
      if (heartbeatRunning) return;
      heartbeatRunning = true;
      try {
        if (!(await queue.heartbeat(job, progress))) controller.abort();
      } catch {
        controller.abort();
      } finally {
        heartbeatRunning = false;
      }
    }, workerEnv.heartbeatSeconds * 1000);
    const deadline = setTimeout(abort, workerEnv.hardTimeoutSeconds * 1000);
    try {
      await mkdir(workerEnv.workdir, { recursive: true, mode: 0o700 });
      const space = await statfs(workerEnv.workdir);
      if (space.bavail * space.bsize < workerEnv.minFreeBytes)
        throw new MediaProcessError("MEDIA_RESOURCE_DISK");
      const asset = await repo.store.asset(job.assetId);
      if (
        !asset ||
        asset.generation !== job.generation ||
        asset.deletedAt ||
        asset.deletionToken
      )
        throw new MediaProcessError("MEDIA_SOURCE_UNAVAILABLE");
      if (
        asset.provider !== storageEnv.provider ||
        asset.bucket !== storageEnv.bucket
      )
        throw new MediaProcessError("MEDIA_CONFIG_STORAGE");
      const upload = await repo.store.sessionForAsset(asset.id);
      if (!upload || upload.status !== "completed")
        throw new MediaProcessError("MEDIA_SOURCE_UNAVAILABLE");
      const remote = await storage.stat(asset.objectKey);
      if (
        BigInt(remote.sizeBytes) !== asset.sizeBytes ||
        remote.etag !== asset.etag
      )
        throw new MediaProcessError("MEDIA_SOURCE_CHANGED");
      dir = await mkdtemp(
        join(workerEnv.workdir, "job-" + job.leaseToken + "-"),
      );
      const source = join(dir, "source"),
        hash = createHash("sha256"),
        writer = Bun.file(source).writer();
      let downloaded = 0;
      const reader = native.file(asset.objectKey).stream().getReader();
      const stopDownload = () => {
        void reader.cancel().catch(() => {});
      };
      controller.signal.addEventListener("abort", stopDownload, { once: true });
      if (controller.signal.aborted) stopDownload();
      try {
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          if (controller.signal.aborted)
            throw new MediaProcessError("MEDIA_CANCELLED");
          downloaded += chunk.byteLength;
          if (BigInt(downloaded) > asset.sizeBytes)
            throw new MediaProcessError("MEDIA_SOURCE_CHANGED");
          hash.update(chunk);
          writer.write(chunk);
        }
      } finally {
        controller.signal.removeEventListener("abort", stopDownload);
        await reader.cancel().catch(() => {});
        reader.releaseLock();
        await writer.end();
      }
      if (controller.signal.aborted)
        throw new MediaProcessError("MEDIA_CANCELLED");
      if (BigInt(downloaded) !== asset.sizeBytes)
        throw new MediaProcessError("MEDIA_SOURCE_CHANGED");
      const sha256 = hash.digest("hex");
      if (upload.expectedSha256 !== null && sha256 !== upload.expectedSha256)
        throw new MediaProcessError("MEDIA_SOURCE_CHANGED");
      let facts: Record<string, unknown>,
        files: string[],
        tiers: {
          name: string;
          width: number;
          height: number;
          bitrate: number;
        }[] = [];
      if (job.kind === "source") {
        const owner = await repo.store.owner({
          ownerType: "video",
          ownerId: asset.videoId!,
        });
        if (!owner.kind)
          throw new MediaProcessError("MEDIA_SOURCE_UNAVAILABLE");
        await verifyEbml(source, upload.filename);
        const verified = videoFacts(
          await probe(source, workerEnv.ffprobe, controller.signal),
          owner.kind,
          upload.filename,
          downloaded,
        );
        const result = await transcodeHls(source, join(dir, "hls"), verified, {
          ffmpeg: workerEnv.ffmpeg,
          ffprobe: workerEnv.ffprobe,
          threads: workerEnv.threads,
          signal: controller.signal,
          timeoutSeconds: Math.max(
            workerEnv.minTimeoutSeconds,
            Math.ceil((verified.durationMs / 1000) * workerEnv.timeoutFactor),
          ),
          stallSeconds: workerEnv.stallSeconds,
          onProgress: (seconds) => {
            progress = seconds;
          },
        });
        files = result.files;
        tiers = result.tiers;
        facts = { ...verified, profile: "hls-v1" };
      } else {
        await mkdir(join(dir, "hls"));
        facts = await transcodePoster(
          source,
          join(dir, "hls/poster.webp"),
          upload.filename,
          downloaded,
          workerEnv.ffmpeg,
          workerEnv.ffprobe,
          controller.signal,
        );
        files = ["poster.webp"];
      }
      for (const file of files) {
        if (controller.signal.aborted)
          throw new MediaProcessError("MEDIA_CANCELLED");
        const payload = Bun.file(join(dir, "hls", file));
        if (payload.size <= 0 || payload.size > 33554432)
          throw new MediaProcessError("MEDIA_OUTPUT_LIMIT");
        const key = job.outputPrefix + file;
        await storage.put(
          key,
          new Uint8Array(await payload.arrayBuffer()),
          mime(file),
        );
        const checked = await storage.stat(key);
        if (
          checked.sizeBytes !== payload.size ||
          checked.contentType !== mime(file)
        )
          throw new MediaProcessError("MEDIA_OUTPUT_VERIFY_FAILED");
      }
      await repo.transact(async (store) => {
        await store.owner(
          {
            ownerType: asset.videoId ? "video" : "series",
            ownerId: (asset.videoId ?? asset.seriesId)!,
          },
          true,
        );
        const current = await store.job(job.id, true);
        const now = new Date();
        if (
          !current ||
          current.state !== "running" ||
          current.leaseToken !== job.leaseToken ||
          !current.leaseUntil ||
          current.leaseUntil <= now ||
          controller.signal.aborted
        )
          throw new MediaProcessError("MEDIA_STALE_JOB");
        const latest = await store.asset(asset.id, true);
        if (
          !latest ||
          latest.generation !== job.generation ||
          latest.deletionToken ||
          latest.deletedAt
        )
          throw new MediaProcessError("MEDIA_STALE_JOB");
        await store.insertRenditions(
          tiers.map((t, i) => ({
            id: crypto.randomUUID(),
            jobId: job.id,
            ...t,
            playlistKey: job.outputPrefix + i + "/index.m3u8",
          })),
        );
        await store.finishJob(job.id, {
          state: "succeeded",
          outputPrefix: job.outputPrefix,
          outputFiles: files,
          finishedAt: now,
          leaseToken: null,
          leaseUntil: null,
          updatedAt: now,
        });
        await store.updateAsset(asset.id, {
          state: "ready",
          readyJobId: job.id,
          sha256,
          facts,
          verifiedReadyAt: now,
          failedAt: null,
          updatedAt: now,
        });
        await store.stopAttempt(job.leaseToken, now);
      });
      return { state: "succeeded" as const };
    } catch (error) {
      const errno = (error as { code?: string })?.code;
      const code =
        error instanceof MediaProcessError
          ? error.code
          : errno === "ENOENT"
            ? "MEDIA_CONFIG_BINARY"
            : errno === "ENOMEM"
              ? "MEDIA_RESOURCE_MEMORY"
              : errno === "ENOSPC"
                ? "MEDIA_RESOURCE_DISK"
                : "MEDIA_DEPENDENCY_FAILED";
      const pause =
        code.startsWith("MEDIA_RESOURCE_") ||
        code.startsWith("MEDIA_CONFIG_") ||
        code === "MEDIA_CANCELLED";
      const terminal =
        code.startsWith("MEDIA_INVALID_") ||
        code.startsWith("MEDIA_ANIMATED_") ||
        ["MEDIA_SOURCE_CHANGED", "MEDIA_SOURCE_UNAVAILABLE"].includes(code);
      await queue.fail(job, code, terminal, pause);
      return { state: pause ? ("paused" as const) : ("failed" as const), code };
    } finally {
      clearInterval(heartbeat);
      clearTimeout(deadline);
      shutdown?.removeEventListener("abort", abort);
      await queue.stopped(job).catch(() => {});
      if (dir) {
        const base = resolve(workerEnv.workdir) + sep;
        if (!resolve(dir).startsWith(base))
          throw new Error("Unsafe worker temp cleanup");
        await rm(dir, { recursive: true, force: true });
      }
    }
  };
}
