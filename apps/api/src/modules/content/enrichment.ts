import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  genres,
  seasons,
  series,
  seriesGenres,
  videoGenres,
  videos,
} from "../../db/schema";
import type { ContentConnection } from "../../shared/content-db";
import {
  hls,
  poster,
  posterJob,
  posterReady,
  ready,
  source,
  sourceReady,
} from "../catalog/visibility";

// What is missing before a draft can be published, from the same facts the
// publish check and the public catalog use (`ready` is the canonical predicate).
export type MediaState =
  | "needs-video"
  | "needs-cover"
  | "uploading"
  | "processing"
  | "failed"
  | "ready";
export type RowExtras = {
  releaseYear: number | null;
  genres: string[];
  genreCount: number;
  mediaState?: MediaState;
  seasonCount?: number;
  episodeCount?: number;
};
const maxGenres = 3;

// A job counts only for the generation the asset currently has.
const currentJob = (states: string) =>
  sql`EXISTS (SELECT 1 FROM media_jobs j JOIN media_assets a
    ON a.id = j.asset_id AND j.generation = a.generation AND j.kind = a.kind
    WHERE a.id IN (${videos.sourceAssetId}, ${videos.posterAssetId}) AND j.state IN (${sql.raw(states)}))`;
const activeUpload = sql`EXISTS (SELECT 1 FROM upload_sessions u WHERE u.video_id = ${videos.id}
  AND u.status IN ('initializing','pending','completing','aborting'))`;
const mediaState = sql<MediaState>`CASE
  WHEN COALESCE(${ready}, false) THEN 'ready'
  WHEN ${currentJob("'failed'")} THEN 'failed'
  WHEN ${currentJob("'queued','running','retry'")} THEN 'processing'
  WHEN ${activeUpload} THEN 'uploading'
  WHEN COALESCE(${sourceReady}, false) AND NOT COALESCE(${posterReady}, false) THEN 'needs-cover'
  ELSE 'needs-video'
END`;

function groupGenres(rows: { id: string; name: string }[]) {
  const byOwner = new Map<string, string[]>();
  for (const row of rows) {
    const names = byOwner.get(row.id) ?? [];
    names.push(row.name);
    byOwner.set(row.id, names);
  }
  return byOwner;
}
const shown = (names: string[] | undefined) => ({
  genres: (names ?? []).slice(0, maxGenres),
  genreCount: names?.length ?? 0,
});

/** Extra columns for one page of Film/Standalone rows, looked up by id only. */
export async function videoExtras(db: ContentConnection, ids: string[]) {
  const rows = await db
    .select({
      id: videos.id,
      releaseYear: videos.releaseYear,
      mediaState,
    })
    .from(videos)
    .leftJoin(source, eq(videos.sourceAssetId, source.id))
    .leftJoin(hls, eq(source.readyJobId, hls.id))
    .leftJoin(poster, eq(videos.posterAssetId, poster.id))
    .leftJoin(posterJob, eq(poster.readyJobId, posterJob.id))
    .where(inArray(videos.id, ids));
  const names = groupGenres(
    await db
      .select({ id: videoGenres.videoId, name: genres.name })
      .from(videoGenres)
      .innerJoin(genres, eq(videoGenres.genreId, genres.id))
      .where(inArray(videoGenres.videoId, ids))
      .orderBy(asc(genres.name), asc(genres.id)),
  );
  return new Map<string, RowExtras>(
    rows.map((row) => [
      row.id,
      {
        releaseYear: row.releaseYear,
        mediaState: row.mediaState,
        ...shown(names.get(row.id)),
      },
    ]),
  );
}

/** Extra columns for one page of Series rows; archived seasons/episodes are not counted. */
export async function seriesExtras(db: ContentConnection, ids: string[]) {
  const rows = await db
    .select({ id: series.id, releaseYear: series.releaseYear })
    .from(series)
    .where(inArray(series.id, ids));
  const counts = new Map(
    (
      await db
        .select({
          id: seasons.seriesId,
          seasonCount: sql<number>`count(DISTINCT ${seasons.id}) FILTER (WHERE ${seasons.archivedAt} IS NULL)::int`,
          episodeCount: sql<number>`count(${videos.id}) FILTER (WHERE ${seasons.archivedAt} IS NULL AND ${videos.archivedAt} IS NULL AND ${videos.publicationStatus} <> 'archived')::int`,
        })
        .from(seasons)
        .leftJoin(
          videos,
          and(eq(videos.seasonId, seasons.id), eq(videos.kind, "episode")),
        )
        .where(inArray(seasons.seriesId, ids))
        .groupBy(seasons.seriesId)
    ).map((row) => [row.id, row]),
  );
  const names = groupGenres(
    await db
      .select({ id: seriesGenres.seriesId, name: genres.name })
      .from(seriesGenres)
      .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
      .where(inArray(seriesGenres.seriesId, ids))
      .orderBy(asc(genres.name), asc(genres.id)),
  );
  return new Map<string, RowExtras>(
    rows.map((row) => [
      row.id,
      {
        releaseYear: row.releaseYear,
        seasonCount: counts.get(row.id)?.seasonCount ?? 0,
        episodeCount: counts.get(row.id)?.episodeCount ?? 0,
        ...shown(names.get(row.id)),
      },
    ]),
  );
}
