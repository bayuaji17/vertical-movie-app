import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  smallint,
  date,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { series } from "./series";
import { auditColumns, metadataChecks } from "./content-columns";
export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "restrict" }),
    seasonNumber: integer("season_number").notNull(),
    title: varchar("title", { length: 200 }),
    description: text("description"),
    releaseYear: smallint("release_year"),
    releaseDate: date("release_date", { mode: "string" }),
    ...auditColumns(),
  },
  (t) => [
    ...metadataChecks("seasons", t),
    unique("seasons_number_unique").on(t.seriesId, t.seasonNumber),
    check("seasons_number_check", sql`${t.seasonNumber} > 0`),
  ],
);
