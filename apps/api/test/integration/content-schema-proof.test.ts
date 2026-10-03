import { beforeAll, afterAll, test, expect } from "bun:test";
import { contentTestUrl, resetContentDatabase } from "./content-fixture";
import { applyDatabaseMigrations } from "../../src/db/migrate";
import { series, seasons } from "../../src/db/schema";
let database: Awaited<ReturnType<typeof resetContentDatabase>>;
beforeAll(async () => {
  database = await resetContentDatabase();
});
afterAll(async () => {
  await database?.client.close();
});
const actor = { createdBy: "content-admin", updatedBy: "content-admin" };
test("dedicated database guard rejects development and foreign hosts", () => {
  expect(() =>
    contentTestUrl("postgresql://localhost/vertical_movie_app"),
  ).toThrow();
  expect(() =>
    contentTestUrl("postgresql://example.test/vertical_movie_app_content_test"),
  ).toThrow();
});
test("series/season enforce hierarchy, numbers, metadata and rerun preserves auth", async () => {
  const id = Bun.randomUUIDv7();
  await database.db
    .insert(series)
    .values({ id, title: "Series", slug: "schema-series", ...actor });
  await database.db
    .insert(seasons)
    .values({
      id: Bun.randomUUIDv7(),
      seriesId: id,
      seasonNumber: 1,
      ...actor,
    });
  const other = Bun.randomUUIDv7();
  await database.db
    .insert(series)
    .values({ id: other, title: "Other", slug: "schema-other", ...actor });
  await database.db
    .insert(seasons)
    .values({
      id: Bun.randomUUIDv7(),
      seriesId: other,
      seasonNumber: 1,
      ...actor,
    });
  await expect(
    database.db
      .insert(seasons)
      .values({
        id: Bun.randomUUIDv7(),
        seriesId: id,
        seasonNumber: 0,
        ...actor,
      })
      .execute(),
  ).rejects.toThrow();
  await expect(
    database.db
      .insert(series)
      .values({
        id: Bun.randomUUIDv7(),
        title: "Duplicate",
        slug: "schema-series",
        ...actor,
      })
      .execute(),
  ).rejects.toThrow();
  await expect(
    database.db
      .insert(seasons)
      .values({
        id: Bun.randomUUIDv7(),
        seriesId: id,
        seasonNumber: 1,
        ...actor,
      })
      .execute(),
  ).rejects.toThrow();
  await expect(
    database.db
      .insert(seasons)
      .values({
        id: Bun.randomUUIDv7(),
        seriesId: Bun.randomUUIDv7(),
        seasonNumber: 1,
        ...actor,
      })
      .execute(),
  ).rejects.toThrow();
  for (const bad of [
    { title: " " },
    { releaseYear: 2020, releaseDate: "2021-01-01" },
    { releaseYear: 1700 },
  ]) {
    await expect(
      database.db
        .insert(series)
        .values({
          id: Bun.randomUUIDv7(),
          title: "Bad",
          slug: Bun.randomUUIDv7(),
          ...actor,
          ...bad,
        })
        .execute(),
    ).rejects.toThrow();
  }
  const before = await database.client`SELECT id,email FROM "user"`;
  await applyDatabaseMigrations(contentTestUrl());
  expect(await database.client`SELECT id,email FROM "user"`).toEqual(before);
});
