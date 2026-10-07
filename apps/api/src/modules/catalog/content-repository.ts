import { sql } from "drizzle-orm";
import type { ContentDatabase } from "../../shared/content-db";
import { invalid, notFound } from "../../shared/content-error";
import { CatalogHomeStore } from "./home-repository";
import { sqlInstant, type HomeKind } from "./home-pagination";
import type { PublicHomeItem } from "./home-model";
import type { PublicEpisode } from "./content-model";
import {
  episodeCursor,
  type EpisodesQuery,
  type EpisodePosition,
} from "./content-pagination";
import { videos, seasons } from "../../db/schema";

export type EpisodeRead = {
  items: PublicEpisode[];
  total: number;
  nextCursor: string | null;
};
export interface PublicContentReader {
  detail(
    kind: HomeKind,
    slug: string,
    now: Date,
  ): Promise<PublicHomeItem | undefined>;
  episodes(query: EpisodesQuery): Promise<EpisodeRead>;
}
export class PublicContentStore implements PublicContentReader {
  constructor(
    private readonly db: ContentDatabase,
    private readonly home = new CatalogHomeStore(db),
  ) {}
  async detail(kind: HomeKind, slug: string, now: Date) {
    const [row] = await this.db.execute<{ item: PublicHomeItem }>(sql`
      ${this.home.eligible()} SELECT data item FROM home
      WHERE kind=${kind} AND data->>'slug'=${slug} AND at<=${sqlInstant(now)}::timestamptz LIMIT 1`);
    return row?.item;
  }
  statement(q: EpisodesQuery) {
    const after = q.after
      ? sql`(season_number,episode_number,id)>(${q.after.season}::int,${q.after.episode}::int,${q.after.id}::uuid)`
      : sql`true`;
    return sql`${this.home.eligible()},
      parent AS (SELECT id FROM home WHERE kind='series' AND data->>'slug'=${q.slug} AND at<=${q.asOf}::timestamptz),
      filtered AS (
        SELECT p.id,v.slug,p.title,p.synopsis,p.duration_ms,s.season_number,v.episode_number
        FROM playable p JOIN ${videos} v ON v.id=p.id JOIN ${seasons} s ON s.id=v.season_id JOIN parent ON parent.id=p.series_id
        WHERE p.kind='episode' AND p.at<=${q.asOf}::timestamptz
      ),
      page AS (SELECT * FROM filtered WHERE ${after} ORDER BY season_number,episode_number,id LIMIT ${q.limit + 1}),
      taken AS (SELECT * FROM page ORDER BY season_number,episode_number,id LIMIT ${q.limit})
      SELECT (SELECT id FROM parent) "seriesId",
        coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'synopsis',synopsis,'durationMs',duration_ms,'seasonNumber',season_number,'episodeNumber',episode_number) ORDER BY season_number,episode_number,id) FROM taken),'[]'::jsonb) items,
        (SELECT count(*)::int FROM filtered) total,(SELECT count(*)>${q.limit} FROM page) more,
        (SELECT jsonb_build_object('season',season_number,'episode',episode_number,'id',id) FROM taken ORDER BY season_number DESC,episode_number DESC,id DESC LIMIT 1) last`;
  }
  async episodes(query: EpisodesQuery): Promise<EpisodeRead> {
    const [row] = await this.db.execute<{
      seriesId: string | null;
      items: PublicEpisode[];
      total: number;
      more: boolean;
      last: EpisodePosition | null;
    }>(this.statement(query));
    if (!row?.seriesId) notFound();
    if (query.seriesId && query.seriesId !== row.seriesId)
      invalid("Cursor does not match this Series.");
    return {
      items: row.items,
      total: row.total,
      nextCursor:
        row.more && row.last
          ? episodeCursor(query, row.seriesId, row.last)
          : null,
    };
  }
}
