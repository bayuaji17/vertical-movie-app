import { afterAll, beforeAll, expect, test } from "bun:test";
import { resetContentDatabase } from "./content-fixture";
import { attachMedia } from "./content-delete-fixture";
import {
  genres,
  seasons,
  series,
  seriesGenres,
  videoGenres,
  videos,
} from "../../src/db/schema";
import { CatalogStore } from "../../src/modules/catalog/repository";
import { createContentPageRepository } from "../../src/modules/content/repository";
import { ContentPageService } from "../../src/modules/content/service";

let database: Awaited<ReturnType<typeof resetContentDatabase>>;
let service: ContentPageService;
const by = "content-admin";
const owner = { createdBy: by, updatedBy: by };
beforeAll(async () => {
  database = await resetContentDatabase();
  service = new ContentPageService(createContentPageRepository(database.db));
}, 20000);
afterAll(async () => database?.client.close());

async function film(
  title: string,
  extra: Partial<typeof videos.$inferInsert> = {},
) {
  const id = crypto.randomUUID();
  await database.db.insert(videos).values({
    id,
    kind: "movie",
    title,
    slug: title.toLowerCase().replaceAll(" ", "-"),
    ...owner,
    ...extra,
  });
  return id;
}
// A verified asset has facts (the canonical readiness predicate needs them).
async function verified(videoId: string, kind: "source" | "poster") {
  const media = await attachMedia(
    database.client,
    { videoId },
    kind,
    "succeeded",
    "completed",
    "test-bucket",
    by,
  );
  await database.client`UPDATE media_assets SET facts='{"durationMs":600000}'::jsonb WHERE id=${media.assetId}::uuid`;
  return media;
}
// Completing an upload makes its asset the video's active one (`activate`).
const activate = (videoId: string, assetId: string) =>
  database.client`UPDATE videos SET source_asset_id=${assetId}::uuid WHERE id=${videoId}::uuid`;
const stateOf = async (title: string) =>
  (
    await service.list({ type: "film", search: title, pageSize: "100" })
  ).items.find((item) => item.title === title)?.mediaState;

test("mediaState tells which fact is missing, from the same predicate publishing uses", async () => {
  const empty = await film("Plain Draft");
  expect(await stateOf("Plain Draft")).toBe("needs-video");

  const video = await film("Video Only");
  await verified(video, "source");
  expect(await stateOf("Video Only")).toBe("needs-cover");

  const both = await film("Everything Ready");
  await verified(both, "source");
  await verified(both, "poster");
  expect(await stateOf("Everything Ready")).toBe("ready");
  // Removing a verified fact makes it not ready again.
  await database.client`UPDATE media_assets SET facts=NULL WHERE video_id=${both}::uuid AND kind='poster'`;
  expect(await stateOf("Everything Ready")).toBe("needs-cover");

  const queued = await film("Queued Job");
  const q = await attachMedia(
    database.client,
    { videoId: queued },
    "source",
    "queued",
    "completed",
    "test-bucket",
    by,
  );
  await activate(queued, q.assetId);
  expect(await stateOf("Queued Job")).toBe("processing");

  const running = await film("Running Job");
  const r = await attachMedia(
    database.client,
    { videoId: running },
    "source",
    "running",
    "pending",
    "test-bucket",
    by,
  );
  await activate(running, r.assetId);
  // A job in flight wins over the pending upload session of the same asset.
  expect(await stateOf("Running Job")).toBe("processing");

  const failed = await film("Failed Job");
  const f = await attachMedia(
    database.client,
    { videoId: failed },
    "source",
    "running",
    "completed",
    "test-bucket",
    by,
  );
  await activate(failed, f.assetId);
  await database.client`UPDATE media_jobs SET state='failed',lease_token=NULL,lease_until=NULL WHERE id=${f.jobId}::uuid`;
  expect(await stateOf("Failed Job")).toBe("failed");
  // A failure of an older generation no longer counts.
  await database.client`UPDATE media_assets SET generation=2 WHERE id=${f.assetId}::uuid`;
  expect(await stateOf("Failed Job")).toBe("needs-video");

  const uploading = await film("Mid Upload");
  const u = await attachMedia(
    database.client,
    { videoId: uploading },
    "source",
    "queued",
    "pending",
    "test-bucket",
    by,
  );
  await database.client`DELETE FROM media_job_attempts WHERE job_id=${u.jobId}::uuid`;
  await database.client`DELETE FROM media_jobs WHERE id=${u.jobId}::uuid`;
  expect(await stateOf("Mid Upload")).toBe("uploading");

  // Parity: "ready" here is exactly what the publish check and catalog accept.
  const parity = await film("Parity Ready");
  await verified(parity, "source");
  await verified(parity, "poster");
  const store = new CatalogStore(database.db);
  const cases: [string, string][] = [
    [empty, "Plain Draft"],
    [video, "Video Only"],
    [both, "Everything Ready"],
    [queued, "Queued Job"],
    [failed, "Failed Job"],
    [uploading, "Mid Upload"],
    [parity, "Parity Ready"],
  ].map(([id, title]) => [id!, title!]);
  for (const [id, title] of cases)
    expect(!!(await store.readyForPublish(id))).toBe(
      (await stateOf(title)) === "ready",
    );
  expect(await stateOf("Parity Ready")).toBe("ready");
});

test("rows carry release year and at most three genres, with the real total", async () => {
  const id = await film("Genre Rich", { releaseYear: 2024 });
  const names = ["Western", "Action", "Drama", "Comedy", "Horror"];
  const rows = names.map((name) => ({
    id: crypto.randomUUID(),
    slug: name.toLowerCase(),
    name,
  }));
  await database.db.insert(genres).values(rows);
  await database.db
    .insert(videoGenres)
    .values(rows.map((g) => ({ videoId: id, genreId: g.id })));
  const bare = await film("No Genres");
  const items = (
    await service.list({ type: "film", search: "Genre", pageSize: "100" })
  ).items;
  const rich = items.find((i) => i.title === "Genre Rich")!;
  expect(rich.releaseYear).toBe(2024);
  // Alphabetical, first three; the total lets the UI show "+2".
  expect(rich.genres).toEqual(["Action", "Comedy", "Drama"]);
  expect(rich.genreCount).toBe(5);
  const plain = (await service.list({ type: "film", search: "No Genres" }))
    .items[0]!;
  expect(plain).toMatchObject({ releaseYear: null, genres: [], genreCount: 0 });
  expect(plain.id).toBe(bare);
});

test("series rows count active seasons and episodes only", async () => {
  const seriesId = crypto.randomUUID();
  await database.db.insert(series).values({
    id: seriesId,
    title: "Counted Show",
    slug: "counted-show",
    releaseYear: 2020,
    ...owner,
  });
  const season = async (n: number, archived = false) => {
    const id = crypto.randomUUID();
    await database.db.insert(seasons).values({
      id,
      seriesId,
      seasonNumber: n,
      ...owner,
      archivedAt: archived ? new Date() : null,
    });
    return id;
  };
  const s1 = await season(1),
    s2 = await season(2),
    gone = await season(3, true);
  const episode = (seasonId: string, n: number, archived = false) =>
    database.db.insert(videos).values({
      id: crypto.randomUUID(),
      kind: "episode",
      title: `Episode ${n}`,
      slug: `ep-${seasonId.slice(0, 4)}-${n}`,
      seasonId,
      episodeNumber: n,
      publicationStatus: archived ? "archived" : "draft",
      archivedAt: archived ? new Date() : null,
      ...owner,
    });
  await episode(s1, 1);
  await episode(s1, 2);
  await episode(s2, 1);
  await episode(s2, 2, true); // archived episode
  await episode(gone, 1); // episode of an archived season
  const [genre] = await database.db.select().from(genres).limit(1);
  await database.db
    .insert(seriesGenres)
    .values({ seriesId, genreId: genre!.id });
  const row = (await service.list({ type: "series", search: "Counted" }))
    .items[0]!;
  expect(row).toMatchObject({
    seasonCount: 2,
    episodeCount: 3,
    releaseYear: 2020,
    genreCount: 1,
  });
  expect(row.mediaState).toBeUndefined();
  // Seasonless rows of other types do not get series counts.
  const movie = (await service.list({ type: "film", search: "Plain Draft" }))
    .items[0]!;
  expect(movie.seasonCount).toBeUndefined();
});

test("the extras cost does not grow with the table: a 25-row page over 10,000 rows stays fast", async () => {
  await database.client
    .unsafe(`INSERT INTO videos (id,kind,title,slug,created_by,updated_by,created_at,updated_at)
    SELECT gen_random_uuid(),'movie','Bulk '||g,'bulk-'||g,'content-admin','content-admin',now()-(g||' seconds')::interval,now()-(g||' seconds')::interval
    FROM generate_series(1,10000) g`);
  const timings: number[] = [];
  for (const pageSize of ["25", "25", "25", "100"]) {
    const started = performance.now();
    const page = await service.list({ type: "film", pageSize, sort: "title" });
    timings.push(performance.now() - started);
    expect(page.items).toHaveLength(Number(pageSize));
    expect(
      page.items.every((item) => item.mediaState && item.genreCount === 0),
    ).toBe(true);
  }
  console.log(
    "list timings ms (25,25,25,100 rows over >10k):",
    timings.map((t) => t.toFixed(1)).join(", "),
  );
  // Generous bound to catch an accidental N+1 or full scan, not a benchmark.
  expect(Math.max(...timings)).toBeLessThan(1500);
}, 60000);
