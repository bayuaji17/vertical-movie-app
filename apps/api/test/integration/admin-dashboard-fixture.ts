import { resetContentDatabase } from "./content-fixture";
import {
  videos,
  series,
  seasons,
  mediaAssets,
  mediaJobs,
} from "../../src/db/schema";
import { eq } from "drizzle-orm";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
export async function seedDashboard(
  database: Awaited<ReturnType<typeof resetContentDatabase>>,
  actor = "content-admin",
) {
  const videoService = new VideosService(createVideosRepository(database.db)),
    seriesService = new SeriesService(createSeriesRepository(database.db));
  const films: string[] = [],
    standalone: string[] = [],
    parents: string[] = [],
    seasonIds: string[] = [],
    episodes: string[] = [];
  for (let n = 0; n < 125; n++)
    films.push(
      (
        await videoService.create(
          {
            kind: "movie",
            title: `Dashboard film ${String(n).padStart(3, "0")}`,
          },
          actor,
        )
      ).id,
    );
  for (let n = 0; n < 12; n++)
    standalone.push(
      (
        await videoService.create(
          { kind: "standalone", title: `Dashboard standalone ${n}` },
          actor,
        )
      ).id,
    );
  for (let n = 0; n < 5; n++) {
    const result = await seriesService.create(
      { title: `Dashboard series ${n}` },
      actor,
    );
    parents.push(result.series.id);
    seasonIds.push(result.defaultSeason.id);
  }
  for (let n = 0; n < 6; n++)
    episodes.push(
      (
        await videoService.create(
          {
            kind: "episode",
            title: `Dashboard episode ${n}`,
            seasonId: seasonIds[n % 3]!,
            episodeNumber: Math.floor(n / 3) + 1,
          },
          actor,
        )
      ).id,
    );
  const publish = {
    publicationStatus: "published" as const,
    publishedAt: new Date("2026-10-01T00:00:00Z"),
    firstPublishedAt: new Date("2026-10-01T00:00:00Z"),
  };
  for (const id of films.slice(120, 122))
    await database.db.update(videos).set(publish).where(eq(videos.id, id));
  for (const id of films.slice(122)) await videoService.archive(id, 1, actor);
  await database.db
    .update(videos)
    .set(publish)
    .where(eq(videos.id, episodes[0]!));
  await database.db
    .update(series)
    .set({ publicationStatus: "unpublished" })
    .where(eq(series.id, parents[3]!));
  await database.db
    .update(series)
    .set(publish)
    .where(eq(series.id, parents[4]!));
  await database.db
    .update(videos)
    .set(publish)
    .where(eq(videos.id, episodes[2]!));
  await database.db
    .update(series)
    .set({ archivedAt: new Date() })
    .where(eq(series.id, parents[2]!));
  await database.db
    .update(seasons)
    .set({ archivedAt: new Date() })
    .where(eq(seasons.id, seasonIds[1]!));
  await database.client`UPDATE videos SET created_at='2026-10-01T00:00:00Z' WHERE kind<>'standalone'`;
  await database.client`UPDATE videos SET created_at='2026-10-02T00:00:00Z' WHERE kind='standalone'`;
  await database.client`UPDATE series SET created_at='2026-10-01T00:00:00Z'`;
  type State =
    "queued" | "running" | "retry" | "failed" | "cancelled" | "succeeded";
  const failures: string[] = [];
  async function job(
    ownerId: string,
    role: "source" | "poster",
    state: State,
    options: {
      series?: boolean;
      executionMode?: "request" | "worker";
      generation?: number;
      assetGeneration?: number;
      current?: boolean;
    } = {},
  ) {
    const assetId = crypto.randomUUID(),
      jobId = crypto.randomUUID();
    await database.db
      .insert(mediaAssets)
      .values({
        id: assetId,
        ...(options.series ? { seriesId: ownerId } : { videoId: ownerId }),
        kind: role,
        provider: "minio",
        bucket: "private-fixture",
        objectKey: `private/${assetId}`,
        state: "uploaded",
        sizeBytes: 1n,
        contentType: role === "source" ? "video/mp4" : "image/png",
        createdBy: actor,
        generation: options.assetGeneration ?? 1,
      });
    await database.db
      .insert(mediaJobs)
      .values({
        id: jobId,
        assetId,
        generation: options.generation ?? 1,
        kind: role,
        executionMode: options.executionMode ?? "worker",
        state,
        attempts: state === "retry" ? 4 : 0,
        failures: state === "retry" ? 3 : 0,
        updatedAt: new Date("2026-10-08T00:00:00Z"),
        ...(state === "running"
          ? {
              leaseToken: crypto.randomUUID(),
              leaseUntil: new Date(Date.now() + 60000),
            }
          : {}),
        ...(state === "succeeded"
          ? {
              outputPrefix: "private/prefix",
              outputFiles: ["private/file"],
              finishedAt: new Date(),
            }
          : {}),
        failureCode: state === "failed" ? "PRIVATE_TEST_FAILURE" : null,
      });
    if (options.current !== false) {
      if (options.series)
        await database.db
          .update(series)
          .set({ posterAssetId: assetId })
          .where(eq(series.id, ownerId));
      else
        await database.db
          .update(videos)
          .set(
            role === "source"
              ? { sourceAssetId: assetId }
              : { posterAssetId: assetId },
          )
          .where(eq(videos.id, ownerId));
    }
    return jobId;
  }
  await job(films[0]!, "source", "queued");
  await job(parents[0]!, "poster", "queued", {
    series: true,
    executionMode: "request",
  });
  await job(standalone[0]!, "source", "running");
  await job(films[0]!, "poster", "running", { executionMode: "request" });
  await job(episodes[0]!, "source", "retry");
  await job(films[1]!, "poster", "retry");
  for (const id of films.slice(2, 6))
    failures.push(await job(id, "source", "failed"));
  failures.push(
    await job(standalone[1]!, "poster", "failed", { executionMode: "request" }),
  );
  failures.push(await job(parents[1]!, "poster", "failed", { series: true }));
  failures.push(await job(episodes[3]!, "source", "failed"));
  await job(films[122]!, "source", "failed");
  await job(episodes[1]!, "source", "failed");
  await job(episodes[2]!, "source", "failed");
  await job(films[0]!, "source", "failed", { current: false });
  await job(films[6]!, "source", "failed", {
    generation: 1,
    assetGeneration: 2,
  });
  await job(films[7]!, "source", "cancelled");
  await job(films[8]!, "source", "succeeded");
  return {
    films,
    standalone,
    parents,
    seasonIds,
    episodes,
    failures,
    job,
    latest: [...standalone].sort().reverse().slice(0, 8),
  };
}
