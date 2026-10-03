import { beforeAll, afterAll, test, expect } from "bun:test";
import { resetContentDatabase } from "./content-fixture";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { SeriesService } from "../../src/modules/series/service";
import { series, videos } from "../../src/db/schema";
import { eq } from "drizzle-orm";
let database: Awaited<ReturnType<typeof resetContentDatabase>>,
  seriesService: SeriesService;
beforeAll(async () => {
  database = await resetContentDatabase();
  seriesService = new SeriesService(createSeriesRepository(database.db));
});
afterAll(async () => {
  await database?.client.close();
});
test("series draft and default season are atomic; edit uses optimistic version", async () => {
  const created = await seriesService.create(
    { title: "Story", slug: "runtime-story" },
    "content-admin",
  );
  expect(created.defaultSeason.seasonNumber).toBe(1);
  expect((await seriesService.get(created.series.id)).seasons).toHaveLength(1);
  const changed = await seriesService.update(
    created.series.id,
    { expectedVersion: 1, title: "Renamed" },
    "content-admin",
  );
  expect(changed.rowVersion).toBe(2);
  expect(changed.slug).toBe("runtime-story");
  await expect(
    seriesService.update(
      created.series.id,
      { expectedVersion: 1, title: "Stale" },
      "content-admin",
    ),
  ).rejects.toThrow();
  await expect(
    seriesService.create(
      {
        title: "Rollback",
        slug: "runtime-rollback",
        genreIds: [Bun.randomUUIDv7()],
      },
      "content-admin",
    ),
  ).rejects.toThrow();
  expect(
    await database.db
      .select()
      .from(series)
      .where(eq(series.slug, "runtime-rollback")),
  ).toHaveLength(0);
});

test("series HTTP success and duplicate slug map to safe errors", async () => {
  const { createSeriesModule } = await import("../../src/modules/series");
  const app = createSeriesModule({
    service: seriesService,
    getSession: async () => ({
      user: {
        id: "content-admin",
        name: "Admin",
        email: "content-admin@example.test",
        role: "admin",
        banned: false,
      },
      session: { expiresAt: new Date(Date.now() + 60000) },
    }),
  });
  const send = () =>
    app.handle(
      new Request("http://localhost/admin/series", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "HTTP Story", slug: "http-story" }),
      }),
    );
  expect((await send()).status).toBe(201);
  const duplicate = await send();
  expect(duplicate.status).toBe(409);
  expect((await duplicate.json()).error.code).toBe("SLUG_CONFLICT");
});

test("seasons have ordered unique numbers and reject stale updates", async () => {
  const created = await seriesService.create(
    { title: "Seasons", slug: "runtime-seasons" },
    "content-admin",
  );
  const second = await seriesService.createSeason(
    created.series.id,
    { seasonNumber: 2, title: "  New Chapter  " },
    "content-admin",
  );
  expect(second.title).toBe("New Chapter");
  expect(
    (await seriesService.listSeasons(created.series.id)).items.map(
      (s) => s.seasonNumber,
    ),
  ).toEqual([1, 2]);
  await expect(
    seriesService.createSeason(
      created.series.id,
      { seasonNumber: 2 },
      "content-admin",
    ),
  ).rejects.toThrow();
  const updated = await seriesService.updateSeason(
    second.id,
    { expectedVersion: 1, title: null },
    "content-admin",
  );
  expect(updated.title).toBeNull();
  await expect(
    seriesService.updateSeason(
      second.id,
      { expectedVersion: 1, seasonNumber: 3 },
      "content-admin",
    ),
  ).rejects.toThrow();
  await database.db
    .insert(videos)
    .values({
      id: Bun.randomUUIDv7(),
      kind: "episode",
      seasonId: second.id,
      episodeNumber: 1,
      title: "Previously live",
      slug: "ever-published-episode",
      createdBy: "content-admin",
      updatedBy: "content-admin",
      firstPublishedAt: new Date(),
      publicationStatus: "unpublished",
    });
  await expect(
    seriesService.updateSeason(
      second.id,
      { expectedVersion: 2, seasonNumber: 3 },
      "content-admin",
    ),
  ).rejects.toThrow();
  await database.db
    .update(series)
    .set({ archivedAt: new Date() })
    .where(eq(series.id, created.series.id));
  await expect(
    seriesService.createSeason(
      created.series.id,
      { seasonNumber: 3 },
      "content-admin",
    ),
  ).rejects.toThrow();
});
