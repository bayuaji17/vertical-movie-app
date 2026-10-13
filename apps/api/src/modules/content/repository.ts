import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { videos, series } from "../../db/schema";
import type { ContentDatabase } from "../../shared/content-db";
import type { ContentPageInput, ContentPage } from "./model";
import { seriesExtras, videoExtras } from "./enrichment";

export type PageFilter = Omit<
  ContentPageInput,
  "page" | "pageSize" | "includeArchived" | "status" | "sort" | "order"
> & {
  page: number;
  pageSize: number;
  status: NonNullable<ContentPageInput["status"]>;
  sort: NonNullable<ContentPageInput["sort"]>;
  order: NonNullable<ContentPageInput["order"]>;
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
          const escaped = input.search?.replace(/[\\%_]/g, "\\$&");
          const filter = and(
            input.status === "all"
              ? undefined
              : input.status === "archived"
                ? isNotNull(table.archivedAt)
                : isNull(table.archivedAt),
            input.status === "draft" || input.status === "published"
              ? eq(table.publicationStatus, input.status)
              : undefined,
            input.type === "series"
              ? undefined
              : eq(videos.kind, input.type === "film" ? "movie" : "standalone"),
            escaped
              ? or(
                  ilike(table.title, `%${escaped}%`),
                  ilike(table.slug, `%${escaped}%`),
                )
              : undefined,
          );
          const direction = input.order === "asc" ? asc : desc;
          // The shown status: archived wins over the stored publication status.
          const sortKey =
            input.sort === "created"
              ? table.createdAt
              : input.sort === "title"
                ? sql`lower(${table.title})`
                : input.sort === "status"
                  ? sql`(CASE WHEN ${table.archivedAt} IS NOT NULL THEN 'archived' ELSE ${table.publicationStatus}::text END)`
                  : table.updatedAt;
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
            .orderBy(direction(sortKey), direction(table.id))
            .limit(input.pageSize)
            .offset((input.page - 1) * input.pageSize);
          // Extra columns are looked up for this page's ids only, in the same
          // snapshot, so their cost does not depend on the size of the table.
          const ids = rows.map((row) => row.id);
          const extras = !ids.length
            ? new Map()
            : input.type === "series"
              ? await seriesExtras(tx, ids)
              : await videoExtras(tx, ids);
          return {
            items: rows.map((row) => ({
              ...row,
              ...extras.get(row.id),
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
