import { createMediaCleanup } from "./cleanup";
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
async function main() {
  const storageEnv = loadStorageEnv(),
    workerEnv = loadWorkerEnv(),
    database = createDatabase(loadDatabaseUrl()),
    native = createStorageClient(storageEnv),
    storage = createMultipartStorage(storageEnv),
    repo = createMediaRepository(database.db),
    queue = createMediaQueue(database.client, workerEnv),
    media = new MediaService(repo, storage, storageEnv),
    run = createJobRunner({
      repo,
      queue,
      native,
      storage,
      storageEnv,
      workerEnv,
    });
  const cleanup = createMediaCleanup({
    client: database.client,
    repo,
    storage,
    profile: storageEnv,
    workerEnv,
  });
  let stopping = false,
    pauseUntil = 0,
    lastRecovery = 0,
    lastCleanup = 0;
  const controller = new AbortController();
  let grace: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    grace = setTimeout(
      () => controller.abort(),
      workerEnv.shutdownSeconds * 1000,
    );
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  const sleep = () => Bun.sleep(workerEnv.pollSeconds * 1000);
  async function slot(maintenance: boolean) {
    while (!stopping) {
      try {
        const now = Date.now();
        if (
          maintenance &&
          now - lastRecovery >= workerEnv.recoverySeconds * 1000
        ) {
          lastRecovery = now;
          await queue.recover();
        }
        if (maintenance && now - lastCleanup >= 3600000) {
          lastCleanup = now;
          await media.cleanup();
          await cleanup();
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
        const result = await run(job, controller.signal);
        if (result.state === "paused" && !stopping) {
          pauseUntil = Date.now() + 300000;
          console.error("Media worker paused: " + result.code);
        } else console.info("Media job " + job.id + ": " + result.state);
      } catch {
        console.error("Media worker dependency unavailable; retrying.");
        await sleep();
      }
    }
  }
  console.info(
    "Media worker started with concurrency " + workerEnv.concurrency,
  );
  try {
    await Promise.all(
      Array.from({ length: workerEnv.concurrency }, (_, i) => slot(i === 0)),
    );
  } finally {
    if (grace) clearTimeout(grace);
    controller.abort();
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
    storage.close();
    await database.client.close();
  }
}
if (import.meta.main)
  main().catch(() => {
    console.error("Media worker failed to start; check server configuration.");
    process.exitCode = 1;
  });
