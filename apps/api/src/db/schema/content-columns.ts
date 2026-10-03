import { sql } from "drizzle-orm";
import {
  check,
  integer,
  smallint,
  date,
  text,
  timestamp,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export function editorialColumns() {
  return {
    title: varchar("title", { length: 200 }).notNull(),
    originalTitle: varchar("original_title", { length: 200 }),
    synopsis: varchar("synopsis", { length: 500 }),
    description: text("description"),
    originalLanguage: varchar("original_language", { length: 35 }),
    releaseYear: smallint("release_year"),
    releaseDate: date("release_date", { mode: "string" }),
  };
}
export function auditColumns() {
  return {
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    rowVersion: integer("row_version").notNull().default(1),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  };
}
export function publicationColumns() {
  return {
    publicationStatus: text("publication_status")
      .$type<"draft" | "published" | "unpublished">()
      .notNull()
      .default("draft"),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  };
}
type MetadataColumns = {
  title: AnyPgColumn;
  releaseYear: AnyPgColumn;
  releaseDate: AnyPgColumn;
  rowVersion: AnyPgColumn;
  description: AnyPgColumn;
};
export function metadataChecks(name: string, t: MetadataColumns) {
  return [
    check(
      `${name}_title_check`,
      sql`${t.title} IS NULL OR length(btrim(${t.title})) > 0`,
    ),
    check(
      `${name}_description_check`,
      sql`${t.description} IS NULL OR length(${t.description}) <= 10000`,
    ),
    check(
      `${name}_year_check`,
      sql`${t.releaseYear} IS NULL OR ${t.releaseYear} BETWEEN 1800 AND 9999`,
    ),
    check(
      `${name}_date_check`,
      sql`${t.releaseDate} IS NULL OR ${t.releaseYear} IS NULL OR EXTRACT(YEAR FROM ${t.releaseDate}) = ${t.releaseYear}`,
    ),
    check(`${name}_version_check`, sql`${t.rowVersion} > 0`),
  ];
}
export function publicationChecks(
  name: string,
  t: {
    publicationStatus: AnyPgColumn;
    publishedAt: AnyPgColumn;
    firstPublishedAt: AnyPgColumn;
    archivedAt: AnyPgColumn;
  },
) {
  return [
    check(
      `${name}_status_check`,
      sql`${t.publicationStatus} IN ('draft','published','unpublished')`,
    ),
    check(
      `${name}_publication_check`,
      sql`(${t.publicationStatus} = 'published' AND ${t.publishedAt} IS NOT NULL AND ${t.firstPublishedAt} IS NOT NULL AND ${t.archivedAt} IS NULL) OR (${t.publicationStatus} IN ('draft','unpublished') AND ${t.publishedAt} IS NULL)`,
    ),
  ];
}
