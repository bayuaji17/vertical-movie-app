import { resetMediaDatabase } from "./media-fixture";
import {
  videos,
  series,
  seasons,
  genres,
  videoGenres,
  seriesGenres,
  mediaAssets,
  mediaJobs,
} from "../../src/db/schema";
import { CatalogStore } from "../../src/modules/catalog/repository";
import { CatalogHomeStore } from "../../src/modules/catalog/home-repository";
import { PublicationService } from "../../src/modules/publication/service";
import { sql } from "drizzle-orm";
const actor = { createdBy: "media-admin", updatedBy: "media-admin" };

/** SQL ready-media fixtures prove reads/publication gates, not FFmpeg or object existence. Storage proof writes actual WebP separately. */
export async function publicCatalogFixture(
  options: {
    videoCount?: number;
    seriesCount?: number;
    genreCount?: number;
    bucket?: string;
    collision?: boolean;
  } = {},
) {
  const db = await resetMediaDatabase(),
    legacy = new CatalogStore(db.db),
    store = new CatalogHomeStore(db.db),
    publisher = new PublicationService(db.db);
  const bucket = options.bucket ?? "vertical-movie-app-media-test",
    posterKeys = new Map<string, string>();
  const videoIds: string[] = [],
    seriesIds: string[] = [],
    seasonIds: string[] = [],
    episodeIds: string[] = [],
    genreIds: string[] = [];
  for (let i = 0; i < (options.genreCount ?? 2); i++) {
    const id = crypto.randomUUID();
    genreIds.push(id);
    await db.db
      .insert(genres)
      .values({ id, slug: `genre-${i}`, name: `Genre ${i}` });
  }
  async function ready(
    ownerId: string,
    ownerType: "video" | "series",
    kind: "source" | "poster",
  ) {
    const id = crypto.randomUUID(),
      job = crypto.randomUUID(),
      prefix = `outputs/${id}/${job}/${crypto.randomUUID()}/`;
    await db.db.insert(mediaAssets).values({
      id,
      ...(ownerType === "video" ? { videoId: ownerId } : { seriesId: ownerId }),
      kind,
      provider: "minio",
      bucket,
      objectKey: `sources/${id}/original`,
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
      outputFiles: sql`${JSON.stringify(
        kind === "source"
          ? [
              "master.m3u8",
              "0/index.m3u8",
              "0/init_0.mp4",
              "0/segment_000000.m4s",
            ]
          : ["poster.webp"],
      )}::text::jsonb`,
      finishedAt: new Date(),
    });
    await db.client`UPDATE media_assets SET state='ready',ready_job_id=${job}::uuid,sha256=${"a".repeat(64)},facts=${JSON.stringify(kind === "source" ? { durationMs: 60000, width: 1080, height: 1920 } : { width: 1080, height: 1920, codec: "webp" })}::text::jsonb,verified_ready_at=now() WHERE id=${id}::uuid`;
    if (ownerType === "series")
      await db.client`UPDATE series SET poster_asset_id=${id}::uuid WHERE id=${ownerId}::uuid`;
    else if (kind === "source")
      await db.client`UPDATE videos SET source_asset_id=${id}::uuid WHERE id=${ownerId}::uuid`;
    else
      await db.client`UPDATE videos SET poster_asset_id=${id}::uuid WHERE id=${ownerId}::uuid`;
    return prefix + "poster.webp";
  }
  async function video(
    i: number,
    kind: "movie" | "standalone" | "episode",
    seasonId?: string,
    episodeNumber = 1,
    historical = true,
  ) {
    const id = crypto.randomUUID();
    await db.db.insert(videos).values({
      id,
      kind,
      slug: `${kind}-${id}`,
      title:
        i === 0 && kind === "movie"
          ? "Rain % _ \\ 🎬"
          : `${kind === "movie" ? "Film" : kind === "standalone" ? "Standalone" : "Episode"} ${i + 1}`,
      synopsis: "A portrait story",
      ...(seasonId ? { seasonId, episodeNumber } : {}),
      rightsConfirmedAt: new Date(),
      rightsConfirmedBy: "media-admin",
      ...actor,
    });
    await ready(id, "video", "source");
    posterKeys.set(`${kind}:${id}`, await ready(id, "video", "poster"));
    if (genreIds.length && i !== 0)
      await db.db
        .insert(videoGenres)
        .values({ videoId: id, genreId: genreIds[i % genreIds.length]! });
    await publisher.publish(
      "video",
      id,
      { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
      "media-admin",
    );
    if (historical)
      await db.client`UPDATE videos SET published_at=${`2026-10-01T03:00:${String(59 - (i % 60)).padStart(2, "0")}.123456Z`}::timestamptz WHERE id=${id}::uuid`;
    return id;
  }
  for (let i = 0; i < (options.videoCount ?? 12); i++)
    videoIds.push(await video(i, i < 6 ? "movie" : "standalone"));
  for (let i = 0; i < (options.seriesCount ?? 6); i++) {
    const id =
        options.collision && i === 0 ? videoIds[0]! : crypto.randomUUID(),
      seasonId = crypto.randomUUID();
    seriesIds.push(id);
    seasonIds.push(seasonId);
    await db.db.insert(series).values({
      id,
      slug: `series-${id}`,
      title: `Series ${i + 1}`,
      synopsis: "A series portrait story",
      ...actor,
    });
    await db.db
      .insert(seasons)
      .values({ id: seasonId, seriesId: id, seasonNumber: 1, ...actor });
    posterKeys.set(`series:${id}`, await ready(id, "series", "poster"));
    episodeIds.push(await video(i, "episode", seasonId));
    if (genreIds.length)
      await db.db
        .insert(seriesGenres)
        .values({ seriesId: id, genreId: genreIds[i % genreIds.length]! });
    await publisher.publish(
      "series",
      id,
      { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
      "media-admin",
    );
    await db.client`UPDATE series SET published_at=${`2026-10-01T03:00:${String(59 - (i % 60)).padStart(2, "0")}.123456Z`}::timestamptz WHERE id=${id}::uuid`;
  }
  return {
    createEpisode: (i: number, seasonId: string, number: number) =>
      video(i, "episode", seasonId, number, false),
    db,
    store,
    legacy,
    publisher,
    videoIds,
    seriesIds,
    seasonIds,
    episodeIds,
    genreIds,
    posterKeys,
    bucket,
    close: () => db.client.close(),
  };
}
