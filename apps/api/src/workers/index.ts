import {
  createLogger,
  errorFields,
  installProcessLogging,
  loadLogEnv,
} from "@repo/log";
import { createMediaCleanup } from "./cleanup";
import { createTombstoneSweep } from "./tombstones";
import { loadDatabaseUrl } from "../config/env";
import { loadStorageEnv } from "../config/storage-env";
import { loadWorkerEnv } from "../config/worker-env";
import { createDatabase } from "../db/client";
import { createMediaRepository } from "../modules/media/repository";
import { MediaService } from "../modules/media/service";
import { createStorageClient } from "../storage/s3";
import { createMultipartStorage } from "../storage/multipart";
import { createMediaQueue } from "./queue";
import { createJobRunner } from "./runner";
const log = createLogger("worker");
async function main() {
  loadLogEnv();
  installProcessLogging(log);
  const storageEnv = loadStorageEnv(),
    workerEnv = loadWorkerEnv(),
    database = createDatabase(loadDatabaseUrl()),
    native = createStorageClient(storageEnv),
    storage = createMultipartStorage(storageEnv),
    repo = createMediaRepository(database.db),
    queue = createMediaQueue(database.client, workerEnv),
    media = new MediaService(repo, storage, storageEnv),
    run = createJobRunner({
      log,
      repo,
      queue,
      native,
      storage,
      storageEnv,
      workerEnv,
    });
  const cleanup = createMediaCleanup({
    log,
    client: database.client,
    repo,
    storage,
    profile: storageEnv,
    workerEnv,
  });
  const sweepTombstones = createTombstoneSweep({
    log,
    client: database.client,
    storage,
    profile: storageEnv,
  });
  let stopping = false,
    pauseUntil = 0,
    lastRecovery = 0,
    lastCleanup = 0,
    lastTombstones = 0;
  const controller = new AbortController();
  let grace: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    log.info("worker.stopping", { graceSeconds: workerEnv.shutdownSeconds });
    grace = setTimeout(
      () => controller.abort(),
      workerEnv.shutdownSeconds * 1000,
    );
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  const sleep = () => Bun.sleep(workerEnv.pollSeconds * 1000);
  async function slot(index: number) {
    const maintenance = index === 0;
    while (!stopping) {
      try {
        const now = Date.now();
        if (
          maintenance &&
          now - lastRecovery >= workerEnv.recoverySeconds * 1000
        ) {
          lastRecovery = now;
          const recovery = await queue.recover();
          if (recovery.recovered > 0)
            log.warn("queue.recover", { recovered: recovery.recovered });
          else log.debug("queue.recover", { recovered: 0 });
          for (const job of recovery.jobs) log.warn("job.lease_expired", job);
        }
        if (maintenance && now - lastTombstones >= 60000) {
          lastTombstones = now;
          await sweepTombstones();
        }
        if (maintenance && now - lastCleanup >= 3600000) {
          lastCleanup = now;
          const startedAt = performance.now();
          const sessions = await media.cleanup();
          const cleaned = await cleanup();
          const fields = {
            ...cleaned,
            uploadSessions: sessions.cleaned,
            durationMs: Math.round(performance.now() - startedAt),
          };
          if (
            cleaned.originals > 0 ||
            cleaned.partials > 0 ||
            sessions.cleaned > 0
          )
            log.info("cleanup", fields);
          else log.debug("cleanup", fields);
        }
        if (now < pauseUntil) {
          await sleep();
          continue;
        }
        const job = await queue.claim();
        if (!job) {
          await sleep();
          continue;
        }
        log.info("job.claimed", {
          jobId: job.id,
          assetId: job.assetId,
          kind: job.kind,
          attempt: job.attempts,
          failures: job.failures,
          slot: index,
        });
        const result = await run(job, controller.signal);
        if (result.state === "paused" && !stopping) {
          pauseUntil = Date.now() + 300000;
          log.warn("worker.paused", {
            code: result.code,
            jobId: job.id,
            resumeInSeconds: 300,
          });
        }
      } catch (error) {
        log.error("worker.dependency_error", {
          retryInSeconds: workerEnv.pollSeconds,
          ...errorFields(error, process.env.NODE_ENV !== "production"),
        });
        await sleep();
      }
    }
  }
  log.info("worker.start", {
    concurrency: workerEnv.concurrency,
    pollSeconds: workerEnv.pollSeconds,
    leaseSeconds: workerEnv.leaseSeconds,
    heartbeatSeconds: workerEnv.heartbeatSeconds,
    maxAttempts: workerEnv.maxAttempts,
    retryDelays: workerEnv.retryDelays,
    threads: workerEnv.threads,
    shutdownSeconds: workerEnv.shutdownSeconds,
    hardTimeoutSeconds: workerEnv.hardTimeoutSeconds,
    logLevel: log.config.level,
  });
  try {
    await Promise.all(
      Array.from({ length: workerEnv.concurrency }, (_, i) => slot(i)),
    );
  } finally {
    if (grace) clearTimeout(grace);
    controller.abort();
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
    storage.close();
    await database.client.close();
    log.info("worker.stopped");
  }
}
if (import.meta.main)
  main().catch((error) => {
    log.error("worker.start_failed", {
      hint: "check server configuration",
      ...errorFields(error, process.env.NODE_ENV !== "production"),
    });
    process.exitCode = 1;
  });
