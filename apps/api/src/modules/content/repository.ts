import { and, count, desc, eq, ilike, isNull } from "drizzle-orm";
import { videos, series } from "../../db/schema";
import type { ContentDatabase } from "../../shared/content-db";
import type { ContentPageInput, ContentPage } from "./model";

export type PageFilter = Omit<
  ContentPageInput,
  "page" | "pageSize" | "includeArchived"
> & {
  page: number;
  pageSize: number;
  includeArchived: boolean;
};
export interface ContentPageRepository {
  list(input: PageFilter): Promise<ContentPage>;
}

/** Count and page rows use one repeatable-read snapshot, including during writes. */
export function createContentPageRepository(
  db: ContentDatabase,
): ContentPageRepository {
  return {
    list: (input) =>
      db.transaction(
        async (tx) => {
          const table = input.type === "series" ? series : videos;
          const filter = and(
            input.includeArchived ? undefined : isNull(table.archivedAt),
            input.type === "series"
              ? undefined
              : eq(videos.kind, input.type === "film" ? "movie" : "standalone"),
            input.search
              ? ilike(
                  table.title,
                  `%${input.search.replace(/[\\%_]/g, "\\$&")}%`,
                )
              : undefined,
          );
          const [summary] = await tx
            .select({ total: count() })
            .from(table)
            .where(filter);
          const total = summary?.total ?? 0;
          const rows = await tx
            .select({
              id: table.id,
              title: table.title,
              slug: table.slug,
              publicationStatus: table.publicationStatus,
              archivedAt: table.archivedAt,
              createdAt: table.createdAt,
              updatedAt: table.updatedAt,
              rowVersion: table.rowVersion,
            })
            .from(table)
            .where(filter)
            .orderBy(desc(table.createdAt), desc(table.id))
            .limit(input.pageSize)
            .offset((input.page - 1) * input.pageSize);
          return {
            items: rows.map((row) => ({
              ...row,
              type: input.type,
              archivedAt: row.archivedAt?.toISOString() ?? null,
              createdAt: row.createdAt.toISOString(),
              updatedAt: row.updatedAt.toISOString(),
            })),
            total,
            page: input.page,
            pageSize: input.pageSize,
            totalPages: Math.ceil(total / input.pageSize),
          };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      ),
  };
}
