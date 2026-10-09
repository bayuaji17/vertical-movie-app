import { sql } from "drizzle-orm";
import type { ContentDatabase } from "../../shared/content-db";
import type { DashboardSummary, DashboardContentType } from "./model";
export interface DashboardSnapshot {
  generatedAt: Date | string;
  content: {
    type: DashboardContentType;
    status: string;
    count: string | bigint | number;
  }[];
  media: { state: string; count: string | bigint | number }[];
  latestContent: (Omit<
    DashboardSummary["latestContent"][number],
    "createdAt"
  > & { createdAt: Date | string })[];
  failedMedia: DashboardSummary["failedMedia"];
}
export interface DashboardRepository {
  read(): Promise<DashboardSnapshot>;
}

// Both counts and the bounded failure list use this exact owner/pointer/generation predicate.
const currentJobs = sql`WITH current_owners AS (
  SELECT CASE WHEN v.kind='movie' THEN 'film' ELSE v.kind END AS type,
    v.id, v.title, s.series_id, v.source_asset_id, v.poster_asset_id
  FROM videos v LEFT JOIN seasons s ON s.id=v.season_id LEFT JOIN series p ON p.id=s.series_id
  WHERE v.archived_at IS NULL AND v.publication_status<>'archived'
    AND (v.kind<>'episode' OR (s.archived_at IS NULL AND p.archived_at IS NULL))
  UNION ALL SELECT 'series', id, title, NULL::uuid, NULL::uuid, poster_asset_id
  FROM series WHERE archived_at IS NULL
), current_jobs AS (
  SELECT j.id AS "jobId", j.state, j.updated_at, o.type, o.id, o.title,
    a.kind AS role, o.series_id AS "seriesId"
  FROM current_owners o JOIN media_assets a ON
    ((o.type='series' AND a.series_id=o.id AND a.video_id IS NULL)
      OR (o.type<>'series' AND a.video_id=o.id AND a.series_id IS NULL))
    AND ((a.kind='source' AND a.id=o.source_asset_id) OR (a.kind='poster' AND a.id=o.poster_asset_id))
  JOIN media_jobs j ON j.asset_id=a.id AND j.generation=a.generation AND j.kind=a.kind
  WHERE j.state IN ('queued','running','retry','failed')
)`;
export function createDashboardRepository(
  db: ContentDatabase,
): DashboardRepository {
  return {
    read: () =>
      db.transaction(
        async (tx) => {
          const timestamp = await tx.execute<{ generatedAt: Date | string }>(
            sql`SELECT transaction_timestamp() AS "generatedAt"`,
          );
          const content = await tx.execute<
            DashboardSnapshot["content"][number]
          >(sql`
      SELECT type, status, count(*)::text AS count FROM (
        SELECT CASE WHEN kind='movie' THEN 'film' ELSE kind END AS type,
          CASE WHEN archived_at IS NOT NULL OR publication_status='archived' THEN 'archived' ELSE publication_status END AS status FROM videos
        UNION ALL SELECT 'series', CASE WHEN archived_at IS NOT NULL THEN 'archived' ELSE publication_status END FROM series
      ) owners GROUP BY type,status`);
          const media = await tx.execute<DashboardSnapshot["media"][number]>(
            sql`${currentJobs} SELECT state,count(*)::text AS count FROM current_jobs GROUP BY state`,
          );
          const latest = await tx.execute<
            DashboardSnapshot["latestContent"][number]
          >(sql`
      SELECT * FROM (
        SELECT CASE WHEN kind='movie' THEN 'film' ELSE kind END AS type, id,title,publication_status AS "publicationStatus", created_at AS "createdAt"
        FROM videos WHERE kind<>'episode' AND archived_at IS NULL AND publication_status<>'archived'
        UNION ALL SELECT 'series',id,title,publication_status,created_at FROM series WHERE archived_at IS NULL
      ) owners ORDER BY "createdAt" DESC,id DESC,type ASC LIMIT 8`);
          const failed = await tx.execute<
            DashboardSnapshot["failedMedia"][number]
          >(sql`${currentJobs}
      SELECT "jobId",type,id,title,role,"seriesId" FROM current_jobs WHERE state='failed' ORDER BY updated_at DESC,"jobId" DESC LIMIT 5`);
          return {
            generatedAt: timestamp[0]!.generatedAt,
            content: [...content] as DashboardSnapshot["content"],
            media: [...media] as DashboardSnapshot["media"],
            latestContent: [...latest] as DashboardSnapshot["latestContent"],
            failedMedia: [...failed] as DashboardSnapshot["failedMedia"],
          };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      ),
  };
}
