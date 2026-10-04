import {
  and,
  or,
  eq,
  isNull,
  isNotNull,
  sql,
  desc,
  gt,
  asc,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  videos,
  seasons,
  series,
  mediaAssets,
  mediaJobs,
} from "../../db/schema";
import type {
  ContentConnection,
  ContentDatabase,
} from "../../shared/content-db";
const source = alias(mediaAssets, "playable_source"),
  poster = alias(mediaAssets, "playable_poster"),
  hls = alias(mediaJobs, "playable_hls"),
  posterJob = alias(mediaJobs, "playable_poster_job");
const ready = and(
  eq(source.kind, "source"),
  eq(source.state, "ready"),
  isNotNull(source.facts),
  isNotNull(source.sha256),
  isNotNull(source.verifiedReadyAt),
  eq(hls.state, "succeeded"),
  eq(hls.generation, source.generation),
  eq(hls.assetId, source.id),
  isNotNull(hls.outputFiles),
  isNotNull(hls.outputPrefix),
  eq(poster.kind, "poster"),
  eq(poster.state, "ready"),
  isNotNull(poster.facts),
  eq(posterJob.state, "succeeded"),
  eq(posterJob.generation, poster.generation),
  eq(posterJob.assetId, poster.id),
  isNotNull(posterJob.outputFiles),
  isNotNull(posterJob.outputPrefix),
);
const publishedParent = and(
  eq(series.publicationStatus, "published"),
  isNull(series.archivedAt),
  sql`length(btrim(${series.title}))>0 AND length(btrim(${series.synopsis}))>0`,
);
const own = and(
  sql`CASE WHEN ${source.facts}->>'durationMs' ~ '^[0-9]+$' THEN (${source.facts}->>'durationMs')::numeric ELSE 0 END BETWEEN 1 AND CASE WHEN ${videos.kind}='episode' THEN 600000 ELSE 1800000 END`,
  eq(videos.publicationStatus, "published"),
  isNull(videos.archivedAt),
  isNotNull(videos.rightsConfirmedAt),
  isNotNull(videos.rightsConfirmedBy),
  sql`length(btrim(${videos.title}))>0 AND length(btrim(${videos.synopsis}))>0`,
);
export class CatalogStore {
  constructor(private readonly db: ContentConnection) {}
  private query() {
    return this.db
      .select({
        video: videos,
        source,
        poster,
        hls,
        posterJob,
        season: seasons,
        parent: series,
      })
      .from(videos)
      .innerJoin(source, eq(videos.sourceAssetId, source.id))
      .innerJoin(hls, eq(source.readyJobId, hls.id))
      .innerJoin(poster, eq(videos.posterAssetId, poster.id))
      .innerJoin(posterJob, eq(poster.readyJobId, posterJob.id))
      .leftJoin(seasons, eq(videos.seasonId, seasons.id))
      .leftJoin(series, eq(seasons.seriesId, series.id));
  }
  async playable({
    id,
    slug,
    seriesId,
    seasonId,
    afterEpisode,
    limit = 21,
    cursor,
    includeSeriesDraft = false,
  }: {
    id?: string;
    slug?: string;
    seriesId?: string;
    seasonId?: string;
    afterEpisode?: number;
    limit?: number;
    cursor?: { at: Date; id: string };
    includeSeriesDraft?: boolean;
  } = {}) {
    return this.query()
      .where(
        and(
          ready,
          own,
          id ? eq(videos.id, id) : undefined,
          slug ? eq(videos.slug, slug) : undefined,
          seriesId ? eq(series.id, seriesId) : undefined,
          seasonId ? eq(videos.seasonId, seasonId) : undefined,
          afterEpisode !== undefined
            ? gt(videos.episodeNumber, afterEpisode)
            : undefined,
          cursor
            ? sql`(${videos.createdAt},${videos.id})<(${cursor.at}::timestamptz,${cursor.id}::uuid)`
            : undefined,
          or(
            isNull(videos.seasonId),
            and(
              isNull(seasons.archivedAt),
              isNull(series.archivedAt),
              includeSeriesDraft ? undefined : publishedParent,
            ),
          ),
        ),
      )
      .orderBy(
        ...(afterEpisode !== undefined
          ? [asc(videos.episodeNumber)]
          : [desc(videos.createdAt), desc(videos.id)]),
      )
      .limit(limit);
  }
  async preview(id: string) {
    return (
      await this.query()
        .where(
          and(
            eq(videos.id, id),
            ready,
            isNull(videos.archivedAt),
            or(
              isNull(videos.seasonId),
              and(isNull(seasons.archivedAt), isNull(series.archivedAt)),
            ),
          ),
        )
        .limit(1)
    )[0];
  }
  async readyForPublish(id: string) {
    return (
      await this.query()
        .where(and(eq(videos.id, id), ready))
        .limit(1)
    )[0];
  }
  async seriesCount(id: string) {
    const inner = this.query()
      .where(
        and(
          ready,
          own,
          eq(series.id, id),
          publishedParent,
          isNull(series.archivedAt),
          isNull(seasons.archivedAt),
        ),
      )
      .as("playable_series_children");
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(inner);
    return r?.n ?? 0;
  }
  async next(seriesId: string, seasonNumber: number, episodeNumber: number) {
    return (
      await this.query()
        .where(
          and(
            ready,
            own,
            eq(series.id, seriesId),
            publishedParent,
            isNull(series.archivedAt),
            isNull(seasons.archivedAt),
            or(
              gt(seasons.seasonNumber, seasonNumber),
              and(
                eq(seasons.seasonNumber, seasonNumber),
                gt(videos.episodeNumber, episodeNumber),
              ),
            ),
          ),
        )
        .orderBy(asc(seasons.seasonNumber), asc(videos.episodeNumber))
        .limit(1)
    )[0];
  }
  async seriesList() {
    return this.db
      .select()
      .from(series)
      .where(and(publishedParent, isNull(series.archivedAt)))
      .orderBy(desc(series.createdAt), desc(series.id))
      .limit(100);
  }
}
export type PlayableRow = NonNullable<
  Awaited<ReturnType<CatalogStore["preview"]>>
>;
export function createCatalogRepository(db: ContentDatabase) {
  return new CatalogStore(db);
}
