import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  primaryKey,
  check,
  index,
} from "drizzle-orm/pg-core";
import { series } from "./series";
import { videos } from "./videos";
export const genres = pgTable(
  "genres",
  {
    id: uuid("id").primaryKey(),
    slug: varchar("slug", { length: 80 })
      .notNull()
      .unique("genres_slug_unique"),
    name: varchar("name", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("genres_name_check", sql`length(btrim(${t.name})) > 0`),
    check("genres_slug_check", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    index("genres_list_idx").on(t.createdAt.desc(), t.id.desc()),
  ],
);
export const seriesGenres = pgTable(
  "series_genres",
  {
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "restrict" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.genreId] }),
    index("series_genres_genre_idx").on(t.genreId, t.seriesId),
  ],
);
export const videoGenres = pgTable(
  "video_genres",
  {
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "restrict" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.videoId, t.genreId] }),
    index("video_genres_genre_idx").on(t.genreId, t.videoId),
  ],
);
