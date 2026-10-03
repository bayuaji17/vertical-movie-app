import { eq, inArray, and, or, isNull, ilike, desc, sql } from "drizzle-orm";
import {
  videos,
  seasons,
  series,
  videoGenres,
  genres,
  seriesGenres,
} from "../../db/schema";
import type {
  ContentDatabase,
  ContentConnection,
} from "../../shared/content-db";
import { assertGenreIds } from "../../shared/content-db";
export class VideosStore {
  constructor(private readonly db: ContentConnection) {}
  async get(id: string, lock = false) {
    const q = this.db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return (await (lock ? q.for("update") : q))[0];
  }
  async list(
    query: import("../../shared/content-pagination").ParsedList,
    input: import("./model").VideoListInput,
  ) {
    return (
      await this.db
        .select({ video: videos })
        .from(videos)
        .leftJoin(seasons, eq(videos.seasonId, seasons.id))
        .leftJoin(series, eq(seasons.seriesId, series.id))
        .where(
          and(
            query.includeArchived ? undefined : isNull(videos.archivedAt),
            query.includeArchived
              ? undefined
              : or(
                  isNull(videos.seasonId),
                  and(isNull(seasons.archivedAt), isNull(series.archivedAt)),
                ),
            input.kind ? eq(videos.kind, input.kind) : undefined,
            input.seriesId ? eq(seasons.seriesId, input.seriesId) : undefined,
            input.seasonId ? eq(videos.seasonId, input.seasonId) : undefined,
            query.search
              ? ilike(
                  videos.title,
                  `%${query.search.replace(/[\\%_]/g, "\\$&")}%`,
                )
              : undefined,
            query.cursor
              ? sql`(${videos.createdAt},${videos.id}) < (${query.cursor.createdAt}::timestamptz,${query.cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(videos.createdAt), desc(videos.id))
        .limit(query.limit + 1)
    ).map((r) => r.video);
  }
  async inheritedGenres(id: string) {
    return (
      await this.db
        .select({ genre: genres })
        .from(seriesGenres)
        .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
        .where(eq(seriesGenres.seriesId, id))
        .orderBy(genres.id)
    ).map((r) => r.genre);
  }
  async parents(ids: string[], lock = false) {
    const seasonIds = [...new Set(ids)].sort();
    if (!seasonIds.length) return [];
    const preliminary = await this.db
      .select()
      .from(seasons)
      .where(inArray(seasons.id, seasonIds))
      .orderBy(seasons.id);
    if (preliminary.length !== seasonIds.length) return [];
    const seriesIds = [...new Set(preliminary.map((s) => s.seriesId))].sort();
    const pq = this.db
      .select()
      .from(series)
      .where(inArray(series.id, seriesIds))
      .orderBy(series.id);
    const parents = await (lock ? pq.for("update") : pq);
    const sq = this.db
      .select()
      .from(seasons)
      .where(inArray(seasons.id, seasonIds))
      .orderBy(seasons.id);
    const children = lock ? await sq.for("update") : preliminary;
    if (
      children.some(
        (s) => preliminary.find((p) => p.id === s.id)?.seriesId !== s.seriesId,
      )
    )
      return [];
    return children.flatMap((season) => {
      const parent = parents.find((p) => p.id === season.seriesId);
      return parent ? [{ season, parent }] : [];
    });
  }
  async insert(values: typeof videos.$inferInsert) {
    const [row] = await this.db.insert(videos).values(values).returning();
    if (!row) throw new Error("Video insert failed");
    return row;
  }
  async genreIds(id: string) {
    return (
      await this.db
        .select({ id: videoGenres.genreId })
        .from(videoGenres)
        .where(eq(videoGenres.videoId, id))
        .orderBy(videoGenres.genreId)
    ).map((g) => g.id);
  }
  async setGenres(id: string, ids: string[]) {
    await assertGenreIds(this.db, ids);
    await this.db.delete(videoGenres).where(eq(videoGenres.videoId, id));
    if (ids.length)
      await this.db
        .insert(videoGenres)
        .values(ids.map((genreId) => ({ videoId: id, genreId })));
  }
  async ownGenres(id: string) {
    return (
      await this.db
        .select({ genre: genres })
        .from(videoGenres)
        .innerJoin(genres, eq(videoGenres.genreId, genres.id))
        .where(eq(videoGenres.videoId, id))
        .orderBy(genres.id)
    ).map((r) => r.genre);
  }
}
export interface VideosRepository {
  store: VideosStore;
  transact<T>(action: (store: VideosStore) => Promise<T>): Promise<T>;
}
export function createVideosRepository(db: ContentDatabase): VideosRepository {
  return {
    store: new VideosStore(db),
    transact: (action) => db.transaction((tx) => action(new VideosStore(tx))),
  };
}
