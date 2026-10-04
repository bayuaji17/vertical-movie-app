import type { SQL } from "bun";
import { readdir, rm, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { MediaRepository } from "../modules/media/repository";
import type { MultipartStorage } from "../storage/multipart";
import type { StorageEnv } from "../config/storage-env";
import type { WorkerEnv } from "../config/worker-env";
export function createMediaCleanup({
  client,
  repo,
  storage,
  profile,
  workerEnv,
  now = () => new Date(),
}: {
  client: SQL;
  repo: MediaRepository;
  storage: MultipartStorage;
  profile: StorageEnv;
  workerEnv: WorkerEnv;
  now?: () => Date;
}) {
  return async function cleanup() {
    const clock = now(),
      readyCutoff = new Date(clock.getTime() - 7 * 86400000),
      partialCutoff = new Date(clock.getTime() - 86400000);
    let originals = 0,
      partials = 0;
    const assets =
      await client`SELECT id FROM media_assets WHERE kind='source' AND deleted_at IS NULL AND (deletion_token IS NOT NULL OR verified_ready_at<=${readyCutoff} OR (state='failed' AND failed_at<=${readyCutoff})) ORDER BY created_at LIMIT 100`;
    for (const item of assets) {
      try {
        const initial = await repo.store.asset(item.id);
        if (
          !initial ||
          initial.provider !== profile.provider ||
          initial.bucket !== profile.bucket
        )
          continue;
        const claim = await repo.transact(async (store) => {
          const owner = await store.owner(
            {
              ownerType: initial.videoId ? "video" : "series",
              ownerId: (initial.videoId ?? initial.seriesId)!,
            },
            true,
          );
          const asset = await store.asset(initial.id, true);
          if (!asset || asset.deletedAt) return;
          if (asset.deletionToken) return asset;
          if (owner.archived || (await store.activeJobs(asset.id))) return;
          const eligible =
            (asset.verifiedReadyAt && asset.verifiedReadyAt <= readyCutoff) ||
            (asset.state === "failed" &&
              asset.failedAt &&
              asset.failedAt <= readyCutoff);
          if (!eligible) return;
          const token = crypto.randomUUID();
          await store.updateAsset(asset.id, {
            deletionToken: token,
            deletionClaimedAt: clock,
            updatedAt: clock,
          });
          return { ...asset, deletionToken: token };
        });
        if (!claim) continue;
        await storage.remove(claim.objectKey);
        await repo.transact(async (store) => {
          const a = await store.asset(claim.id, true);
          if (a?.deletionToken === claim.deletionToken)
            await store.updateAsset(claim.id, {
              deletedAt: now(),
              deletionToken: null,
              deletionClaimedAt: null,
              updatedAt: now(),
            });
        });
        originals++;
      } catch {
        /* Claims persist for idempotent retry; never delete metadata. */
      }
    }
    const attempts =
      await client`SELECT a.token,a.output_prefix AS "prefix",m.provider,m.bucket FROM media_job_attempts a JOIN media_jobs j ON j.id=a.job_id JOIN media_assets m ON m.id=j.asset_id WHERE a.stopped_at<=${partialCutoff} AND a.cleaned_at IS NULL AND NOT (j.state='running' AND j.lease_token=a.token) AND NOT (j.state='succeeded' AND j.output_prefix=a.output_prefix) AND NOT EXISTS(SELECT 1 FROM media_assets active WHERE active.ready_job_id=j.id AND j.output_prefix=a.output_prefix) LIMIT 100`;
    for (const a of attempts) {
      try {
        if (
          a.provider !== profile.provider ||
          a.bucket !== profile.bucket ||
          !/^outputs\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/$/.test(
            a.prefix,
          )
        )
          continue;
        for (const key of await storage.listKeys(a.prefix))
          await storage.remove(key);
        await client`UPDATE media_job_attempts SET cleaned_at=${now()} WHERE token=${a.token}::uuid`;
        partials++;
      } catch {
        /* Failed prefixes remain discoverable next sweep. */
      }
    }
    // On Linux an independent timeout process bounds orphaned FFmpeg after worker death.
    // Remove only stopped attempts older than that bound; successful runner already removes its temp directory.
    try {
      const base = resolve(workerEnv.workdir) + sep;
      for (const name of await readdir(workerEnv.workdir)) {
        const token = name.match(/^job-([a-f0-9-]{36})-/)?.[1];
        if (!token) continue;
        const path = resolve(join(workerEnv.workdir, name));
        if (!path.startsWith(base)) continue;
        const age = clock.getTime() - (await stat(path)).mtimeMs;
        if (age < (workerEnv.hardTimeoutSeconds + 60) * 1000) continue;
        const [attempt] =
          await client`SELECT stopped_at FROM media_job_attempts WHERE token=${token}::uuid`;
        if (
          attempt?.stopped_at &&
          clock.getTime() - new Date(attempt.stopped_at).getTime() > 60000
        )
          await rm(path, { recursive: true, force: true });
      }
    } catch {
      /* Temp recovery repeats without affecting bucket assets. */
    }
    return { originals, partials };
  };
}
