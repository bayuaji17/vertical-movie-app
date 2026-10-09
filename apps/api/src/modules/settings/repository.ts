import { and, eq, sql } from "drizzle-orm";
import { siteSettings } from "../../db/schema/site-settings";
import type { ContentDatabase } from "../../shared/content-db";
import type { SettingsFields } from "./model";
export interface SettingsRepository {
  read(): Promise<unknown | null>;
  save(
    fields: SettingsFields,
    expectedVersion: number,
  ): Promise<unknown | null>;
}
export function createSettingsRepository(
  db: ContentDatabase,
): SettingsRepository {
  return {
    async read() {
      const [row] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.id, 1));
      return row ?? null;
    },
    async save(fields, expectedVersion) {
      const [row] = await db
        .update(siteSettings)
        .set({
          ...fields,
          rowVersion: sql`${siteSettings.rowVersion}+1`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(siteSettings.id, 1),
            eq(siteSettings.rowVersion, expectedVersion),
          ),
        )
        .returning();
      return row ?? null;
    },
  };
}
