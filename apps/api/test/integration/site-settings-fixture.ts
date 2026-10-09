import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "../../src/db/schema";
import { resetContentDatabase } from "./content-fixture";
import { SettingsService } from "../../src/modules/settings/service";
import { createSettingsRepository } from "../../src/modules/settings/repository";

/** Destructive setup is guarded by resetContentDatabase's exact test database. */
export async function createSettingsFixture() {
  const database = await resetContentDatabase();
  const statements: string[] = [];
  const db = drizzle({
    client: database.client,
    schema,
    logger: {
      logQuery(query) {
        if (/\bsite_settings\b/i.test(query)) statements.push(query);
      },
    },
  });
  let now = Date.now();
  const repository = createSettingsRepository(db);
  const service = new SettingsService(repository, () => now);
  return {
    ...database,
    service,
    repository,
    statements,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
    reads: () => statements.filter((q) => /^select\b/i.test(q)).length,
    writes: () => statements.filter((q) => /^update\b/i.test(q)).length,
    close: () => database.client.close(),
  };
}
