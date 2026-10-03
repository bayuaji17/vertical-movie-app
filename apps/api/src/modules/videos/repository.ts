import { eq, inArray } from "drizzle-orm";
import { videos, seasons, series, videoGenres, genres } from "../../db/schema";
import type {
  ContentDatabase,
  ContentConnection,
} from "../../shared/content-db";
import { assertGenreIds } from "../../shared/content-db";
export class VideosStore {
  constructor(private readonly db: ContentConnection) {}
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
