import { beforeAll, afterAll, test, expect } from "bun:test";
import { resetContentDatabase } from "./content-fixture";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { SeriesService } from "../../src/modules/series/service";
import { series } from "../../src/db/schema";
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
