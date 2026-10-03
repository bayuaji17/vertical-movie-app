import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  unique,
  check,
  index,
} from "drizzle-orm/pg-core";
import { seasons } from "./seasons";
import { user } from "./auth";
import {
  editorialColumns,
  auditColumns,
  publicationColumns,
  metadataChecks,
  publicationChecks,
} from "./content-columns";
export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey(),
    kind: text("kind").$type<"standalone" | "movie" | "episode">().notNull(),
    seasonId: uuid("season_id").references(() => seasons.id, {
      onDelete: "restrict",
    }),
    episodeNumber: integer("episode_number"),
    slug: varchar("slug", { length: 180 })
      .notNull()
      .unique("videos_slug_unique"),
    ...editorialColumns(),
    rightsConfirmedAt: timestamp("rights_confirmed_at", { withTimezone: true }),
    rightsConfirmedBy: text("rights_confirmed_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    ...publicationColumns(),
    ...auditColumns(),
  },
  (t) => [
    ...metadataChecks("videos", t),
    ...publicationChecks("videos", t),
    check(
      "videos_kind_check",
      sql`${t.kind} IN ('standalone','movie','episode')`,
    ),
    check(
      "videos_episode_check",
      sql`(${t.kind} = 'episode' AND ${t.seasonId} IS NOT NULL AND ${t.episodeNumber} IS NOT NULL AND ${t.episodeNumber} > 0) OR (${t.kind} IN ('standalone','movie') AND ${t.seasonId} IS NULL AND ${t.episodeNumber} IS NULL)`,
    ),
    check("videos_slug_check", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "videos_rights_check",
      sql`(${t.rightsConfirmedAt} IS NULL) = (${t.rightsConfirmedBy} IS NULL)`,
    ),
    unique("videos_episode_number_unique").on(t.seasonId, t.episodeNumber),
    index("videos_admin_list_idx")
      .on(t.createdAt.desc(), t.id.desc())
      .where(sql`${t.archivedAt} IS NULL`),
    index("videos_kind_list_idx")
      .on(t.kind, t.createdAt.desc(), t.id.desc())
      .where(sql`${t.archivedAt} IS NULL`),
  ],
);
