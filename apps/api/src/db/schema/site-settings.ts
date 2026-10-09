import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer("id").primaryKey().default(1),
    siteName: text("site_name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    footerText: text("footer_text").notNull(),
    rowVersion: integer("row_version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("site_settings_singleton", sql`${t.id} = 1`),
    check(
      "site_settings_name",
      sql`char_length(btrim(${t.siteName})) BETWEEN 1 AND 80`,
    ),
    check("site_settings_tagline", sql`char_length(${t.tagline}) <= 160`),
    check(
      "site_settings_description",
      sql`char_length(${t.description}) <= 500`,
    ),
    check("site_settings_footer", sql`char_length(${t.footerText}) <= 300`),
    check("site_settings_version", sql`${t.rowVersion} > 0`),
  ],
);
