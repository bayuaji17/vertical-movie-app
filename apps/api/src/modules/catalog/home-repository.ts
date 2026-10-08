import { and, eq, isNull, or, sql, type SQL as DrizzleSQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  videos,
  series,
  seasons,
  genres,
  videoGenres,
  seriesGenres,
  mediaAssets,
  mediaJobs,
} from "../../db/schema";
import type { ContentDatabase } from "../../shared/content-db";
import { unavailable } from "../../shared/content-error";
import {
  source,
  poster,
  hls,
  posterJob,
  ready,
  own,
  publishedParent,
} from "./visibility";
import {
  homeCursor,
  sqlInstant,
  type HomeKind,
  type HomeQuery,
} from "./home-pagination";
import type { PublicHomeItem, PublicHomeGenre } from "./home-model";

export type HomePageRead = {
  items: PublicHomeItem[];
  total: number;
  nextCursor: string | null;
};
export type HomeGenresRead = {
  items: PublicHomeGenre[];
  nextCursor: string | null;
};
export type HomePosterRead = { key: string; provider: string; bucket: string };
export interface HomeStore {
  page(query: HomeQuery): Promise<HomePageRead>;
  genres(query: HomeQuery): Promise<HomeGenresRead>;
  poster(
    kind: HomeKind,
    id: string,
    now?: Date,
  ): Promise<HomePosterRead | undefined>;
}
const parentPoster = alias(mediaAssets, "home_parent_poster"),
  parentJob = alias(mediaJobs, "home_parent_poster_job");
const utc = (column: DrizzleSQL) =>
  sql`to_char(${column} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const output = (
  asset: typeof mediaAssets | typeof parentPoster,
  job: typeof mediaJobs | typeof parentJob,
) =>
  sql`${job.outputFiles} @> '["poster.webp"]'::jsonb AND ${job.outputPrefix} ~ ('^outputs/' || ${asset.id}::text || '/' || ${job.id}::text || '/[a-f0-9-]{36}/$')`;

export class CatalogHomeStore implements HomeStore {
  constructor(private readonly db: ContentDatabase) {}
  /** Shared editorial/asset gates stay identical to legacy; homepage additionally requires canonical outputs. */
  eligible() {
    const playable = this.db
      .select({
        id: videos.id,
        kind: videos.kind,
        title: videos.title,
        synopsis: videos.synopsis,
        at: sql`${videos.publishedAt}`.as("at"),
        series_id: sql`${seasons.seriesId}`.as("series_id"),
        duration_ms: sql`(${source.facts}->>'durationMs')::numeric::int`.as(
          "duration_ms",
        ),
        poster_id: sql`${poster.id}`.as("poster_id"),
      })
      .from(videos)
      .innerJoin(source, eq(videos.sourceAssetId, source.id))
      .innerJoin(hls, eq(source.readyJobId, hls.id))
      .innerJoin(poster, eq(videos.posterAssetId, poster.id))
      .innerJoin(posterJob, eq(poster.readyJobId, posterJob.id))
      .leftJoin(seasons, eq(videos.seasonId, seasons.id))
      .leftJoin(series, eq(seasons.seriesId, series.id))
      .where(
        and(
          ready,
          own,
          eq(source.videoId, videos.id),
          eq(poster.videoId, videos.id),
          isNull(source.seriesId),
          isNull(poster.seriesId),
          eq(hls.kind, "source"),
          eq(posterJob.kind, "poster"),
          sql`${poster.sha256} IS NOT NULL AND ${poster.verifiedReadyAt} IS NOT NULL`,
          or(
            isNull(videos.seasonId),
            and(isNull(seasons.archivedAt), publishedParent),
          ),
          sql`${hls.outputFiles} @> '["master.m3u8"]'::jsonb AND ${hls.outputPrefix} ~ ('^outputs/' || ${source.id}::text || '/' || ${hls.id}::text || '/[a-f0-9-]{36}/$')`,
          sql`${posterJob.outputFiles} @> '["poster.webp"]'::jsonb AND ${posterJob.outputPrefix} ~ ('^outputs/' || ${poster.id}::text || '/' || ${posterJob.id}::text || '/[a-f0-9-]{36}/$')`,
        ),
      );
    const parents = this.db
      .select({
        id: series.id,
        kind: sql`'series'::text`.as("kind"),
        title: series.title,
        synopsis: series.synopsis,
        at: sql`${series.publishedAt}`.as("at"),
        poster_id: sql`${parentPoster.id}`.as("poster_id"),
        episode_count: sql`child_counts.n`.as("episode_count"),
      })
      .from(series)
      .innerJoin(parentPoster, eq(series.posterAssetId, parentPoster.id))
      .innerJoin(parentJob, eq(parentPoster.readyJobId, parentJob.id))
      .innerJoin(sql`child_counts`, sql`child_counts.series_id = ${series.id}`)
      .where(
        and(
          publishedParent,
          eq(parentPoster.kind, "poster"),
          eq(parentPoster.seriesId, series.id),
          isNull(parentPoster.videoId),
          eq(parentJob.kind, "poster"),
          eq(parentPoster.state, "ready"),
          eq(parentJob.state, "succeeded"),
          eq(parentJob.assetId, parentPoster.id),
          eq(parentJob.generation, parentPoster.generation),
          sql`${parentPoster.facts} IS NOT NULL`,
          sql`${parentPoster.sha256} IS NOT NULL AND ${parentPoster.verifiedReadyAt} IS NOT NULL`,
          output(parentPoster, parentJob),
        ),
      );
    return sql`WITH playable AS (${playable.getSQL()}),
      child_counts AS (SELECT series_id,count(*)::int n FROM playable WHERE kind='episode' GROUP BY series_id),
      parents AS (${parents.getSQL()}),
      video_genres_data AS (SELECT ${videoGenres.videoId} owner_id,jsonb_agg(jsonb_build_object('id',${genres.id},'name',${genres.name},'slug',${genres.slug}) ORDER BY ${genres.name},${genres.id}) genres FROM ${videoGenres} JOIN ${genres} ON ${genres.id}=${videoGenres.genreId} GROUP BY ${videoGenres.videoId}),
      series_genres_data AS (SELECT ${seriesGenres.seriesId} owner_id,jsonb_agg(jsonb_build_object('id',${genres.id},'name',${genres.name},'slug',${genres.slug}) ORDER BY ${genres.name},${genres.id}) genres FROM ${seriesGenres} JOIN ${genres} ON ${genres.id}=${seriesGenres.genreId} GROUP BY ${seriesGenres.seriesId}),
      home AS (
        SELECT p.id,p.kind,p.at,p.title,p.synopsis,p.poster_id,jsonb_build_object('id',p.id,'kind',p.kind,'slug',v.slug,'title',p.title,'synopsis',p.synopsis,'publishedAt',${utc(sql`p.at`)},'genres',coalesce(g.genres,'[]'::jsonb),'posterPath','/catalog/'||p.kind||'/'||p.id::text||'/poster','durationMs',p.duration_ms) data
        FROM playable p JOIN ${videos} v ON v.id=p.id LEFT JOIN video_genres_data g ON g.owner_id=p.id WHERE p.kind IN ('movie','standalone')
        UNION ALL
        SELECT p.id,p.kind,p.at,p.title,p.synopsis,p.poster_id,jsonb_build_object('id',p.id,'kind',p.kind,'slug',s.slug,'title',p.title,'synopsis',p.synopsis,'publishedAt',${utc(sql`p.at`)},'genres',coalesce(g.genres,'[]'::jsonb),'posterPath','/catalog/series/'||p.id::text||'/poster','episodeCount',p.episode_count) data
        FROM parents p JOIN ${series} s ON s.id=p.id LEFT JOIN series_genres_data g ON g.owner_id=p.id
      )`;
  }
  statement(q: HomeQuery) {
    const search = `%${q.search.replace(/[\\%_]/g, "\\$&")}%`;
    const filter = sql.join(
      [
        sql`at <= ${q.asOf}::timestamptz`,
        ...(q.kind ? [sql`kind=${q.kind}`] : []),
        ...(q.genreId
          ? [
              sql`data->'genres' @> ${JSON.stringify([{ id: q.genreId }])}::text::jsonb`,
            ]
          : []),
        ...(q.search
          ? [sql`(title ILIKE ${search} OR synopsis ILIKE ${search})`]
          : []),
      ],
      sql` AND `,
    );
    const after = q.after
      ? sql`at < ${q.after.at}::timestamptz OR (at = ${q.after.at}::timestamptz AND (id > ${q.after.id}::uuid OR (id = ${q.after.id}::uuid AND kind COLLATE "C" > ${q.after.kind} COLLATE "C")))`
      : sql`true`;
    return sql`${this.eligible()},filtered AS (SELECT * FROM home WHERE ${filter}),
      page AS (SELECT * FROM filtered WHERE ${after} ORDER BY at DESC,id ASC,kind COLLATE "C" ASC LIMIT ${q.limit + 1}),
      taken AS (SELECT * FROM page ORDER BY at DESC,id ASC,kind COLLATE "C" ASC LIMIT ${q.limit})
      SELECT coalesce((SELECT jsonb_agg(data ORDER BY at DESC,id ASC,kind COLLATE "C" ASC) FROM taken),'[]'::jsonb) items,
        (SELECT count(*)::int FROM filtered) total,(SELECT count(*)>${q.limit} FROM page) more,
        (SELECT jsonb_build_object('at',${utc(sql`at`)},'id',id,'kind',kind) FROM taken ORDER BY at ASC,id DESC,kind COLLATE "C" DESC LIMIT 1) last`;
  }
  async page(q: HomeQuery): Promise<HomePageRead> {
    const [r] = await this.db.execute<{
      items: PublicHomeItem[];
      total: number;
      more: boolean;
      last: { at: string; id: string; kind: HomeKind } | null;
    }>(this.statement(q));
    return {
      items: r!.items,
      total: r!.total,
      nextCursor: r!.more && r!.last ? homeCursor(q, r!.last) : null,
    };
  }
  async genres(q: HomeQuery): Promise<HomeGenresRead> {
    const after = q.after
      ? sql`g.created_at < ${q.after.at}::timestamptz OR (g.created_at = ${q.after.at}::timestamptz AND g.id > ${q.after.id}::uuid)`
      : sql`true`;
    const [r] = await this.db.execute<{
      items: PublicHomeGenre[];
      more: boolean;
      last: { at: string; id: string } | null;
    }>(sql`${this.eligible()},
      linked AS (SELECT DISTINCT (genre->>'id')::uuid id FROM home CROSS JOIN LATERAL jsonb_array_elements(data->'genres') genre WHERE at<=${q.asOf}::timestamptz),
      page AS (SELECT g.* FROM ${genres} g JOIN linked ON linked.id=g.id WHERE g.created_at<=${q.asOf}::timestamptz AND (${after}) ORDER BY g.created_at DESC,g.id ASC LIMIT ${q.limit + 1}),
      taken AS (SELECT * FROM page ORDER BY created_at DESC,id ASC LIMIT ${q.limit})
      SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'slug',slug) ORDER BY created_at DESC,id ASC) FROM taken),'[]'::jsonb) items,
      (SELECT count(*)>${q.limit} FROM page) more,(SELECT jsonb_build_object('at',${utc(sql`created_at`)},'id',id) FROM taken ORDER BY created_at ASC,id DESC LIMIT 1) last`);
    return {
      items: r!.items,
      nextCursor: r!.more && r!.last ? homeCursor(q, r!.last) : null,
    };
  }
  async poster(
    kind: HomeKind,
    id: string,
    now = new Date(),
  ): Promise<HomePosterRead | undefined> {
    const [r] = await this.db
      .execute<HomePosterRead>(sql`${this.eligible()} SELECT a.provider,a.bucket,j.output_prefix||'poster.webp' key
      FROM home JOIN ${mediaAssets} a ON a.id=home.poster_id JOIN ${mediaJobs} j ON j.id=a.ready_job_id
      WHERE home.kind=${kind} AND home.id=${id}::uuid AND home.at<=${sqlInstant(now)}::timestamptz LIMIT 1`);
    if (!r) return undefined;
    if (
      typeof r.key !== "string" ||
      typeof r.provider !== "string" ||
      typeof r.bucket !== "string"
    )
      unavailable();
    return { key: r.key, provider: r.provider, bucket: r.bucket };
  }
}
