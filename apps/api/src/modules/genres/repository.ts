import { and, desc, ilike, sql } from "drizzle-orm";
import { genres } from "../../db/schema";
import type { ContentConnection } from "../../shared/content-db";
import type { ParsedList } from "../../shared/content-pagination";
export function createGenresRepository(db: ContentConnection) {
  return {
    async insert(values: typeof genres.$inferInsert) {
      const [row] = await db.insert(genres).values(values).returning();
      if (!row) throw new Error("Genre insert failed");
      return row;
    },
    list(query: ParsedList) {
      return db
        .select()
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
  };
}
export type GenresRepository = ReturnType<typeof createGenresRepository>;
