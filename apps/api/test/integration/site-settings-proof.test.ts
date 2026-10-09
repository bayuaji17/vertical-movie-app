import { afterAll, beforeAll, expect, test } from "bun:test";
import { resetContentDatabase } from "./content-fixture";
import { SettingsService } from "../../src/modules/settings/service";
import { createSettingsRepository } from "../../src/modules/settings/repository";
let database: Awaited<ReturnType<typeof resetContentDatabase>>,
  service: SettingsService;
beforeAll(async () => {
  database = await resetContentDatabase();
  service = new SettingsService(createSettingsRepository(database.db));
}, 30000);
afterAll(async () => {
  await database?.client.close();
});
test("real Bun SQL/Drizzle CAS saves exactly one concurrent writer and survives service restart", async () => {
  const initial = await service.read();
  const { rowVersion, updatedAt, ...fields } = initial;
  expect(Date.parse(updatedAt)).toBeGreaterThan(0);
  const results = await Promise.allSettled(
    ["One", "Two"].map((siteName) =>
      service.save({ ...fields, siteName, expectedVersion: rowVersion }),
    ),
  );
  expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((x) => x.status === "rejected")).toHaveLength(1);
  const stored = await new SettingsService(
    createSettingsRepository(database.db),
  ).read();
  expect(stored.rowVersion).toBe(2);
  expect(["One", "Two"]).toContain(stored.siteName);
});
