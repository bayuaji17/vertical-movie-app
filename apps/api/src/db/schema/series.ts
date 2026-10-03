import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  check,
  index,
} from "drizzle-orm/pg-core";
import {
  editorialColumns,
  auditColumns,
  publicationColumns,
  metadataChecks,
  publicationChecks,
} from "./content-columns";
export const series = pgTable(
  "series",
  {
    id: uuid("id").primaryKey(),
    slug: varchar("slug", { length: 180 })
      .notNull()
      .unique("series_slug_unique"),
    ...editorialColumns(),
    completionStatus: text("completion_status")
      .$type<"ongoing" | "completed">()
      .notNull()
      .default("ongoing"),
    ...publicationColumns(),
    ...auditColumns(),
  },
  (t) => [
    ...metadataChecks("series", t),
    ...publicationChecks("series", t),
    check("series_slug_check", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "series_completion_check",
      sql`${t.completionStatus} IN ('ongoing','completed')`,
    ),
    index("series_admin_list_idx")
      .on(t.createdAt.desc(), t.id.desc())
      .where(sql`${t.archivedAt} IS NULL`),
  ],
);
