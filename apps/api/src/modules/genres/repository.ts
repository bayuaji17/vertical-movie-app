import { and, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { genres, seriesGenres, videoGenres } from "../../db/schema";
import type { ContentConnection } from "../../shared/content-db";
import type { ParsedList } from "../../shared/content-pagination";

// Content that carries the genre directly (videos plus series).
const usageCount = sql<number>`(
  (select count(*) from ${videoGenres} where ${videoGenres.genreId} = ${genres.id})
  + (select count(*) from ${seriesGenres} where ${seriesGenres.genreId} = ${genres.id})
)::int`;
const withUsage = { ...getTableColumns(genres), usageCount };
export type GenreRow = typeof genres.$inferSelect & { usageCount: number };

export function createGenresRepository(db: ContentConnection) {
  return {
    async insert(values: typeof genres.$inferInsert): Promise<GenreRow> {
      const [row] = await db.insert(genres).values(values).returning();
      if (!row) throw new Error("Genre insert failed");
      return { ...row, usageCount: 0 };
    },
    async find(id: string): Promise<GenreRow | undefined> {
      const [row] = await db
        .select(withUsage)
        .from(genres)
        .where(eq(genres.id, id));
      return row;
    },
    list(query: ParsedList): Promise<GenreRow[]> {
      return db
        .select(withUsage)
        .from(genres)
        .where(
          and(
            query.search
              ? ilike(
                  genres.name,
                  `%${query.search.replace(/[\\%_]/g, "\\$&")}%`,
                )
              : undefined,
            query.cursor
              ? sql`(${genres.createdAt},${genres.id}) < (${query.cursor.createdAt}::timestamptz,${query.cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(genres.createdAt), desc(genres.id))
        .limit(query.limit + 1);
    },
    // Conditional on the updatedAt the caller read; no row means "not found or
    // changed since" and the service tells the two apart.
    async update(
      id: string,
      expectedUpdatedAt: string,
      values: { name?: string; slug?: string; updatedAt: Date },
    ) {
      const [row] = await db
        .update(genres)
        .set(values)
        .where(
          and(
            eq(genres.id, id),
            sql`date_trunc('milliseconds', ${genres.updatedAt}) = ${expectedUpdatedAt}::timestamptz`,
          ),
        )
        .returning({ id: genres.id });
      return row !== undefined;
    },
    // The FK is RESTRICT, so a genre that content still uses cannot be removed.
    async remove(id: string) {
      const rows = await db
        .delete(genres)
        .where(eq(genres.id, id))
        .returning({ id: genres.id });
      return rows.length > 0;
    },
  };
}
export type GenresRepository = ReturnType<typeof createGenresRepository>;
