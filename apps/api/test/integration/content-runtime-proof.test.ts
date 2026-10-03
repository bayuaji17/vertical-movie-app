import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { beforeAll, afterAll, test, expect } from "bun:test";
import { resetContentDatabase } from "./content-fixture";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { SeriesService } from "../../src/modules/series/service";
import { series, videos, seasons } from "../../src/db/schema";
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
test("concurrent parent archive and child creation serialize without deadlock", async () => {
  const parent = await seriesService.create(
    { title: "Archive Race" },
    "content-admin",
  );
  const svc = new VideosService(createVideosRepository(database.db));
  const results = await Promise.allSettled([
    seriesService.archiveSeason(parent.defaultSeason.id, 1, "content-admin"),
    svc.create(
      {
        kind: "episode",
        title: "Racing Child",
        seasonId: parent.defaultSeason.id,
        episodeNumber: 1,
      },
      "content-admin",
    ),
  ]);
  expect(results[0]?.status).toBe("fulfilled");
  const [row] = await database.db
    .select()
    .from(seasons)
    .where(eq(seasons.id, parent.defaultSeason.id));
  expect(row?.archivedAt).not.toBeNull();
  const persisted = await svc.list({
    seasonId: parent.defaultSeason.id,
    includeArchived: "true",
  });
  expect(persisted.items).toHaveLength(
    results[1]?.status === "fulfilled" ? 1 : 0,
  );
  expect(
    (await svc.list({ seasonId: parent.defaultSeason.id })).items,
  ).toHaveLength(0);
  await expect(
    svc.create(
      {
        kind: "episode",
        title: "After Archive",
        seasonId: parent.defaultSeason.id,
        episodeNumber: 2,
      },
      "content-admin",
    ),
  ).rejects.toThrow();
}, 10000);
test("slug races have one winner and conflicting episode edits roll back metadata", async () => {
  const svc = new VideosService(createVideosRepository(database.db));
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      svc.create(
        { kind: "movie", title: "Slug Race", slug: "slug-race" },
        "content-admin",
      ),
    ),
  );
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(
    1,
  );
  const parent = await seriesService.create(
    { title: "Episode Edit Conflict" },
    "content-admin",
  );
  await svc.create(
    {
      kind: "episode",
      title: "First",
      seasonId: parent.defaultSeason.id,
      episodeNumber: 1,
    },
    "content-admin",
  );
  const second = await svc.create(
    {
      kind: "episode",
      title: "Second",
      seasonId: parent.defaultSeason.id,
      episodeNumber: 2,
    },
    "content-admin",
  );
  await expect(
    svc.update(
      second.id,
      { expectedVersion: 1, title: "Must Roll Back", episodeNumber: 1 },
      "content-admin",
    ),
  ).rejects.toThrow();
  const persisted = await svc.get(second.id);
  expect(persisted.title).toBe("Second");
  expect(persisted.episodeNumber).toBe(2);
  expect(persisted.rowVersion).toBe(1);
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
  await database.db.insert(videos).values({
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

test("genre taxonomy persists, paginates and treats search wildcards literally", async () => {
  const { GenresService } = await import("../../src/modules/genres/service");
  const { createGenresRepository } =
    await import("../../src/modules/genres/repository");
  const svc = new GenresService(createGenresRepository(database.db));
  const created = await svc.create({
    name: "  Tax Drama  ",
    slug: "tax-drama",
  });
  expect(created.name).toBe("Tax Drama");
  await svc.create({ name: "Tax 100%", slug: "tax-percent" });
  await expect(
    svc.create({ name: "Duplicate", slug: "tax-drama" }),
  ).rejects.toThrow();
  const first = await svc.list({ limit: "1", search: "Tax" });
  expect(first.items).toHaveLength(1);
  expect(first.nextCursor).not.toBeNull();
  const second = await svc.list({
    limit: "1",
    search: "Tax",
    cursor: first.nextCursor ?? undefined,
  });
  expect(second.items).toHaveLength(1);
  expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  expect(second.nextCursor).toBeNull();
  expect((await svc.list({ search: "%" })).items.map((g) => g.slug)).toEqual([
    "tax-percent",
  ]);
});

test("video drafts persist kinds and atomically verify episode parent and genre", async () => {
  const svc = new VideosService(createVideosRepository(database.db));
  const parent = await seriesService.create(
    { title: "Video series", slug: "video-series" },
    "content-admin",
  );
  const movie = await svc.create(
    {
      kind: "movie",
      title: "Long Movie",
      slug: "long-movie",
      rightsConfirmed: true,
    },
    "content-admin",
  );
  expect(movie.seasonId).toBeNull();
  expect(movie.rightsConfirmedAt).not.toBeNull();
  expect(movie.publicationStatus).toBe("draft");
  const standalone = await svc.create(
    { kind: "standalone", title: "Solo", slug: "solo-video" },
    "content-admin",
  );
  expect(standalone.episodeNumber).toBeNull();
  const episode = await svc.create(
    {
      kind: "episode",
      title: "Episode 1",
      slug: "first-episode",
      seasonId: parent.defaultSeason.id,
      episodeNumber: 1,
    },
    "content-admin",
  );
  expect(episode.seasonId).toBe(parent.defaultSeason.id);
  await expect(
    svc.create(
      {
        kind: "episode",
        title: "Missing parent",
        seasonId: Bun.randomUUIDv7(),
        episodeNumber: 1,
      },
      "content-admin",
    ),
  ).rejects.toThrow();
  await expect(
    svc.create(
      {
        kind: "movie",
        title: "Bad genres",
        slug: "bad-video-genres",
        genreIds: [Bun.randomUUIDv7()],
      },
      "content-admin",
    ),
  ).rejects.toThrow();
  expect(
    await database.db
      .select()
      .from(videos)
      .where(eq(videos.slug, "bad-video-genres")),
  ).toHaveLength(0);
  const race = await Promise.allSettled(
    [1, 2].map(() =>
      svc.create(
        {
          kind: "episode",
          title: "Duplicate Race",
          seasonId: parent.defaultSeason.id,
          episodeNumber: 2,
        },
        "content-admin",
      ),
    ),
  );
  expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
});

test("video list/detail preserve grouping inheritance and cursor on tied timestamps", async () => {
  const { genres } = await import("../../src/db/schema");
  const genre = Bun.randomUUIDv7();
  await database.db
    .insert(genres)
    .values({ id: genre, name: "Inherited", slug: "inherited-genre" });
  const parent = await seriesService.create(
    { title: "Cursor Series", slug: "cursor-series", genreIds: [genre] },
    "content-admin",
  );
  const svc = new VideosService(createVideosRepository(database.db), {
    id: () => Bun.randomUUIDv7(),
    now: () => new Date("2026-10-03T08:00:00Z"),
  });
  const created = await Promise.all(
    [1, 2, 3].map((n) =>
      svc.create(
        {
          kind: "episode",
          title: "Cursor Episode " + n,
          seasonId: parent.defaultSeason.id,
          episodeNumber: n,
        },
        "content-admin",
      ),
    ),
  );
  const firstVideo = created[0];
  if (!firstVideo) throw new Error("Missing video");
  const detail = await svc.get(firstVideo.id);
  expect(detail.series?.id).toBe(parent.series.id);
  expect(detail.effectiveGenres.map((g) => g.id)).toEqual([genre]);
  expect(detail.genreIds).toHaveLength(0);
  let cursor: string | undefined;
  const seen: string[] = [];
  do {
    const result = await svc.list({
      seriesId: parent.series.id,
      limit: "1",
      cursor,
    });
    seen.push(...result.items.map((v) => v.id));
    cursor = result.nextCursor ?? undefined;
  } while (cursor);
  expect(new Set(seen).size).toBe(3);
  expect(seen).toHaveLength(3);
  expect(
    (await svc.list({ kind: "movie", seriesId: parent.series.id })).items,
  ).toHaveLength(0);
  const first = await svc.list({ seriesId: parent.series.id, limit: "1" });
  await expect(
    svc.list({ kind: "movie", cursor: first.nextCursor ?? undefined }),
  ).rejects.toThrow();
  const solo = await svc.get(
    (
      await svc.create(
        { kind: "movie", title: "No Parent Movie", genreIds: [genre] },
        "content-admin",
      )
    ).id,
  );
  expect(solo.series).toBeNull();
  expect(solo.effectiveGenres.map((g) => g.id)).toEqual([genre]);
});

test("video update is atomic under concurrency and validates hierarchy and genre inheritance", async () => {
  const svc = new VideosService(createVideosRepository(database.db)),
    parent = await seriesService.create(
      { title: "Edit Series", slug: "edit-series" },
      "content-admin",
    );
  const first = await svc.create(
    {
      kind: "episode",
      title: "Edit Episode",
      seasonId: parent.defaultSeason.id,
      episodeNumber: 1,
    },
    "content-admin",
  );
  const race = await Promise.allSettled(
    ["A", "B"].map((title) =>
      svc.update(first.id, { expectedVersion: 1, title }, "content-admin"),
    ),
  );
  expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await svc.get(first.id)).rowVersion).toBe(2);
  await expect(
    svc.update(
      first.id,
      {
        expectedVersion: 2,
        title: "Must rollback",
        genreIds: [Bun.randomUUIDv7()],
      },
      "content-admin",
    ),
  ).rejects.toThrow();
  expect((await svc.get(first.id)).rowVersion).toBe(2);
  expect((await svc.get(first.id)).title).not.toBe("Must rollback");
  const second = await seriesService.createSeason(
    parent.series.id,
    { seasonNumber: 2 },
    "content-admin",
  );
  const moved = await svc.update(
    first.id,
    {
      expectedVersion: 2,
      seasonId: second.id,
      episodeNumber: 2,
      rightsConfirmed: true,
    },
    "content-admin",
  );
  expect(moved.seasonId).toBe(second.id);
  expect(moved.rightsConfirmedAt).not.toBeNull();
  const cleared = await svc.update(
    first.id,
    { expectedVersion: 3, rightsConfirmed: false, genreIds: [] },
    "content-admin",
  );
  expect(cleared.rightsConfirmedAt).toBeNull();
  await database.db
    .update(videos)
    .set({ firstPublishedAt: new Date(), publicationStatus: "unpublished" })
    .where(eq(videos.id, first.id));
  await expect(
    svc.update(
      first.id,
      { expectedVersion: 4, episodeNumber: 3 },
      "content-admin",
    ),
  ).rejects.toThrow();
  const movie = await svc.create(
    { kind: "movie", title: "Edit Movie" },
    "content-admin",
  );
  await expect(
    svc.update(
      movie.id,
      { expectedVersion: 1, seasonId: second.id },
      "content-admin",
    ),
  ).rejects.toThrow();
});

test("archive preserves metadata, prevents writes and protects published children", async () => {
  const svc = new VideosService(createVideosRepository(database.db));
  const movie = await svc.create(
    { kind: "movie", title: "Archive Movie", slug: "archive-movie" },
    "content-admin",
  );
  const archived = await svc.archive(movie.id, 1, "content-admin");
  expect(archived.archivedAt).not.toBeNull();
  expect((await svc.list({ search: "Archive Movie" })).items).toHaveLength(0);
  expect(
    (await svc.list({ search: "Archive Movie", includeArchived: "true" }))
      .items,
  ).toHaveLength(1);
  expect((await svc.get(movie.id)).title).toBe("Archive Movie");
  await expect(
    svc.update(
      movie.id,
      { expectedVersion: 2, title: "Changed" },
      "content-admin",
    ),
  ).rejects.toThrow();
  expect((await svc.archive(movie.id, 2, "content-admin")).rowVersion).toBe(2);
  await expect(svc.archive(movie.id, 1, "content-admin")).rejects.toThrow();
  const parent = await seriesService.create(
    { title: "Archive Series", slug: "archive-series" },
    "content-admin",
  );
  const ep = await svc.create(
    {
      kind: "episode",
      title: "Archive Child",
      seasonId: parent.defaultSeason.id,
      episodeNumber: 1,
    },
    "content-admin",
  );
  await database.db
    .update(videos)
    .set({
      publicationStatus: "published",
      firstPublishedAt: new Date(),
      publishedAt: new Date(),
    })
    .where(eq(videos.id, ep.id));
  await expect(svc.archive(ep.id, 1, "content-admin")).rejects.toThrow();
  await expect(
    seriesService.archive(parent.series.id, 1, "content-admin"),
  ).rejects.toThrow();
  await expect(
    seriesService.archiveSeason(parent.defaultSeason.id, 1, "content-admin"),
  ).rejects.toThrow();
  await database.db
    .update(videos)
    .set({ publicationStatus: "unpublished", publishedAt: null })
    .where(eq(videos.id, ep.id));
  await seriesService.archiveSeason(
    parent.defaultSeason.id,
    1,
    "content-admin",
  );
  expect((await svc.list({ seriesId: parent.series.id })).items).toHaveLength(
    0,
  );
  expect(
    (await svc.list({ seriesId: parent.series.id, includeArchived: "true" }))
      .items,
  ).toHaveLength(1);
  await expect(
    svc.create(
      {
        kind: "episode",
        title: "Blocked",
        seasonId: parent.defaultSeason.id,
        episodeNumber: 2,
      },
      "content-admin",
    ),
  ).rejects.toThrow();
  await seriesService.archive(parent.series.id, 1, "content-admin");
  expect((await seriesService.get(parent.series.id)).archivedAt).not.toBeNull();
});
