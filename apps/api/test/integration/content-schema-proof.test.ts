import { beforeAll, afterAll, test, expect } from "bun:test";
import { contentTestUrl, resetContentDatabase } from "./content-fixture";
import { applyDatabaseMigrations } from "../../src/db/migrate";
import { series, seasons, videos } from "../../src/db/schema";
let database: Awaited<ReturnType<typeof resetContentDatabase>>;
beforeAll(async () => {
  database = await resetContentDatabase();
});
test("video kinds enforce nullable pairs, rights, publication and concurrent episode uniqueness", async () => {
  const seriesId = Bun.randomUUIDv7();
  await database.db
    .insert(series)
    .values({
      id: seriesId,
      title: "Video parent",
      slug: "video-parent",
      ...actor,
    });
  const [season] = await database.db
    .insert(seasons)
    .values({ id: Bun.randomUUIDv7(), seriesId, seasonNumber: 1, ...actor })
    .returning();
  if (!season) throw new Error("Season fixture missing");
  const base = { title: "Video", ...actor };
  for (const kind of ["movie", "standalone"] as const)
    await database.db
      .insert(videos)
      .values({
        ...base,
        id: Bun.randomUUIDv7(),
        slug: `schema-${kind}`,
        kind,
      });
  const bads = [
    { kind: "episode" as const },
    { kind: "episode" as const, seasonId: season.id },
    { kind: "episode" as const, episodeNumber: 1 },
    { kind: "episode" as const, seasonId: season.id, episodeNumber: 0 },
    { kind: "movie" as const, seasonId: season.id },
    { kind: "standalone" as const, episodeNumber: 1 },
    { kind: "movie" as const, rightsConfirmedBy: "content-admin" },
    { kind: "movie" as const, publicationStatus: "published" as const },
  ];
  for (const bad of bads)
    await expect(
      database.db
        .insert(videos)
        .values({
          ...base,
          id: Bun.randomUUIDv7(),
          slug: Bun.randomUUIDv7(),
          ...bad,
        })
        .execute(),
    ).rejects.toThrow();
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      database.db
        .insert(videos)
        .values({
          ...base,
          id: Bun.randomUUIDv7(),
          slug: Bun.randomUUIDv7(),
          kind: "episode",
          seasonId: season.id,
          episodeNumber: 1,
        })
        .execute(),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  await expect(
    Promise.resolve(
      database.client`INSERT INTO videos(id,kind,title,slug,created_by,updated_by) VALUES (${Bun.randomUUIDv7()},'unknown','Bad','unknown-kind','content-admin','content-admin')`,
    ),
  ).rejects.toThrow();
  const secondSeason = Bun.randomUUIDv7();
  await database.db
    .insert(seasons)
    .values({
      ...actor,
      id: secondSeason,
      seriesId: season.seriesId,
      seasonNumber: 2,
    });
  await database.db
    .insert(videos)
    .values({
      ...base,
      id: Bun.randomUUIDv7(),
      slug: "other-season-episode",
      kind: "episode",
      seasonId: secondSeason,
      episodeNumber: 1,
    });
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
  await database.db.insert(seasons).values({
    id: Bun.randomUUIDv7(),
    seriesId: id,
    seasonNumber: 1,
    ...actor,
  });
  const other = Bun.randomUUIDv7();
  await database.db
    .insert(series)
    .values({ id: other, title: "Other", slug: "schema-other", ...actor });
  await database.db.insert(seasons).values({
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
