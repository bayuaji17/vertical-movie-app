import { and, eq, isNull, isNotNull, desc, ilike, sql } from "drizzle-orm";
import { series, seasons, seriesGenres, videos } from "../../db/schema";
import type {
  ContentDatabase,
  ContentConnection,
} from "../../shared/content-db";
import { assertGenreIds } from "../../shared/content-db";
import type { ParsedList } from "../../shared/content-pagination";
export class SeriesStore {
  constructor(private readonly db: ContentConnection) {}
  async getSeason(id: string, lock = false) {
    const q = this.db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    return (await (lock ? q.for("update") : q))[0];
  }
  async updateSeason(
    id: string,
    version: number,
    values: Partial<typeof seasons.$inferInsert>,
  ) {
    return (
      await this.db
        .update(seasons)
        .set(values)
        .where(and(eq(seasons.id, id), eq(seasons.rowVersion, version)))
        .returning()
    )[0];
  }
  async seasonHasPublished(id: string, ever = false) {
    return (
      (
        await this.db
          .select({ id: videos.id })
          .from(videos)
          .where(
            and(
              eq(videos.seasonId, id),
              ever
                ? isNotNull(videos.firstPublishedAt)
                : eq(videos.publicationStatus, "published"),
            ),
          )
          .limit(1)
      ).length > 0
    );
  }
  async get(id: string, lock = false) {
    const q = this.db.select().from(series).where(eq(series.id, id)).limit(1);
    return (await (lock ? q.for("update") : q))[0];
  }
  list(query: ParsedList) {
    return this.db
      .select()
      .from(series)
      .where(
        and(
          ...[
            query.includeArchived ? undefined : isNull(series.archivedAt),
            query.search
              ? ilike(
                  series.title,
                  `%${query.search.replace(/[\\%_]/g, "\\$&")}%`,
                )
              : undefined,
            query.cursor
              ? sql`(${series.createdAt},${series.id}) < (${query.cursor.createdAt}::timestamptz,${query.cursor.id}::uuid)`
              : undefined,
          ],
        ),
      )
      .orderBy(desc(series.createdAt), desc(series.id))
      .limit(query.limit + 1);
  }
  async insert(values: typeof series.$inferInsert) {
    const [row] = await this.db.insert(series).values(values).returning();
    if (!row) throw new Error("Series insert failed");
    return row;
  }
  async update(
    id: string,
    version: number,
    values: Partial<typeof series.$inferInsert>,
  ) {
    return (
      await this.db
        .update(series)
        .set(values)
        .where(and(eq(series.id, id), eq(series.rowVersion, version)))
        .returning()
    )[0];
  }
  async insertSeason(values: typeof seasons.$inferInsert) {
    const [row] = await this.db.insert(seasons).values(values).returning();
    if (!row) throw new Error("Season insert failed");
    return row;
  }
  listSeasons(id: string, includeArchived = false) {
    return this.db
      .select()
      .from(seasons)
      .where(
        and(
          eq(seasons.seriesId, id),
          includeArchived ? undefined : isNull(seasons.archivedAt),
        ),
      )
      .orderBy(seasons.seasonNumber);
  }
  async genreIds(id: string) {
    return (
      await this.db
        .select({ id: seriesGenres.genreId })
        .from(seriesGenres)
        .where(eq(seriesGenres.seriesId, id))
        .orderBy(seriesGenres.genreId)
    ).map((r) => r.id);
  }
  async setGenres(id: string, ids: string[]) {
    await assertGenreIds(this.db, ids);
    await this.db.delete(seriesGenres).where(eq(seriesGenres.seriesId, id));
    if (ids.length)
      await this.db
        .insert(seriesGenres)
        .values(ids.map((genreId) => ({ seriesId: id, genreId })));
  }
}
export interface SeriesRepository {
  store: SeriesStore;
  transact<T>(action: (store: SeriesStore) => Promise<T>): Promise<T>;
}
export function createSeriesRepository(db: ContentDatabase): SeriesRepository {
  return {
    store: new SeriesStore(db),
    transact: (action) => db.transaction((tx) => action(new SeriesStore(tx))),
  };
}
