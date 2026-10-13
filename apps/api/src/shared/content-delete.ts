import { inArray, or } from "drizzle-orm";

import {
  contentOperations,
  mediaAssets,
  mediaJobAttempts,
  mediaJobs,
  mediaRenditions,
  mediaStorageTombstones,
  seasons,
  series,
  seriesGenres,
  uploadSessions,
  videoGenres,
  videos,
} from "../db/schema";
import { ContentError } from "./content-error";
import type { ContentConnection } from "./content-db";

/** Everything a deletion removes; callers collect the cascade before calling. */
export type PurgeScope = {
  videoIds: string[];
  seasonIds: string[];
  seriesIds: string[];
};
export type PurgeResult = {
  series: number;
  seasons: number;
  videos: number;
  assets: number;
  uploadSessions: number;
  jobs: number;
  storageObjects: number;
};
const busySessions = ["initializing", "pending", "completing", "aborting"];
const busyJobs = ["queued", "running", "retry"];
const some = (ids: string[]) => ids.length > 0;

/**
 * Delete content rows and everything hanging off them inside the caller's
 * transaction, in an order that satisfies the RESTRICT and circular asset
 * foreign keys. Storage objects are never touched here: each one is recorded
 * in `media_storage_tombstones` for the worker to remove afterwards.
 */
export async function purgeContent(
  db: ContentConnection,
  scope: PurgeScope,
): Promise<PurgeResult> {
  const { videoIds, seasonIds, seriesIds } = scope;
  const owner = or(
    some(videoIds) ? inArray(mediaAssets.videoId, videoIds) : undefined,
    some(seriesIds) ? inArray(mediaAssets.seriesId, seriesIds) : undefined,
  );
  const assets = owner
    ? await db
        .select({
          id: mediaAssets.id,
          provider: mediaAssets.provider,
          bucket: mediaAssets.bucket,
          objectKey: mediaAssets.objectKey,
        })
        .from(mediaAssets)
        .where(owner)
        .for("update")
    : [];
  const assetIds = assets.map((a) => a.id);
  const sessions = some(assetIds)
    ? await db
        .select({
          id: uploadSessions.id,
          assetId: uploadSessions.assetId,
          status: uploadSessions.status,
          stagingKey: uploadSessions.stagingKey,
        })
        .from(uploadSessions)
        .where(inArray(uploadSessions.assetId, assetIds))
        .for("update")
    : [];
  const jobs = some(assetIds)
    ? await db
        .select({ id: mediaJobs.id, state: mediaJobs.state })
        .from(mediaJobs)
        .where(inArray(mediaJobs.assetId, assetIds))
        .for("update")
    : [];
  if (
    sessions.some((s) => busySessions.includes(s.status)) ||
    jobs.some((j) => busyJobs.includes(j.state))
  )
    throw new ContentError(
      "CONTENT_BUSY",
      "An upload or media job is still running. Abort the upload or wait for processing to finish, then try again.",
    );
  const jobIds = jobs.map((j) => j.id);

  const tombstones = assets.flatMap((a) => [
    {
      provider: a.provider,
      bucket: a.bucket,
      kind: "object" as const,
      key: a.objectKey,
    },
    {
      provider: a.provider,
      bucket: a.bucket,
      kind: "prefix" as const,
      key: `outputs/${a.id}/`,
    },
    ...sessions
      .filter((s) => s.assetId === a.id)
      .map((s) => ({
        provider: a.provider,
        bucket: a.bucket,
        kind: "object" as const,
        key: s.stagingKey,
      })),
  ]);
  if (tombstones.length)
    await db
      .insert(mediaStorageTombstones)
      .values(tombstones)
      .onConflictDoNothing();

  // Break the circular references between content and its assets and jobs.
  if (some(videoIds))
    await db
      .update(videos)
      .set({ posterAssetId: null, sourceAssetId: null })
      .where(inArray(videos.id, videoIds));
  if (some(seriesIds))
    await db
      .update(series)
      .set({ posterAssetId: null })
      .where(inArray(series.id, seriesIds));
  if (some(assetIds))
    await db
      .update(mediaAssets)
      .set({ readyJobId: null })
      .where(inArray(mediaAssets.id, assetIds));

  if (some(jobIds)) {
    await db
      .delete(mediaJobAttempts)
      .where(inArray(mediaJobAttempts.jobId, jobIds));
    await db
      .delete(mediaRenditions)
      .where(inArray(mediaRenditions.jobId, jobIds));
    await db.delete(mediaJobs).where(inArray(mediaJobs.id, jobIds));
  }
  if (some(assetIds)) {
    await db
      .delete(uploadSessions)
      .where(inArray(uploadSessions.assetId, assetIds));
    await db.delete(mediaAssets).where(inArray(mediaAssets.id, assetIds));
  }
  const operations = or(
    some(videoIds) ? inArray(contentOperations.videoId, videoIds) : undefined,
    some(seriesIds)
      ? inArray(contentOperations.seriesId, seriesIds)
      : undefined,
  );
  if (operations) await db.delete(contentOperations).where(operations);
  if (some(videoIds)) {
    await db.delete(videoGenres).where(inArray(videoGenres.videoId, videoIds));
    await db.delete(videos).where(inArray(videos.id, videoIds));
  }
  if (some(seasonIds))
    await db.delete(seasons).where(inArray(seasons.id, seasonIds));
  if (some(seriesIds)) {
    await db
      .delete(seriesGenres)
      .where(inArray(seriesGenres.seriesId, seriesIds));
    await db.delete(series).where(inArray(series.id, seriesIds));
  }
  return {
    series: seriesIds.length,
    seasons: seasonIds.length,
    videos: videoIds.length,
    assets: assetIds.length,
    uploadSessions: sessions.length,
    jobs: jobIds.length,
    storageObjects: tombstones.length,
  };
}
