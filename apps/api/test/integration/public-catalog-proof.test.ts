import { expect, test } from "bun:test";
import { publicCatalogFixture } from "./public-catalog-fixture";
import { parseHome } from "../../src/modules/catalog/home-pagination";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { CatalogHomeStore } from "../../src/modules/catalog/home-repository";
import { CatalogService } from "../../src/modules/catalog/service";
import { PublicationService } from "../../src/modules/publication/service";
import type { ContentDatabase } from "../../src/shared/content-db";
import { sql } from "drizzle-orm";
test("unified database catalog pages all kinds without losing precision or duplicate genre joins", async () => {
  const f = await publicCatalogFixture({ collision: true });
  try {
    const now = new Date(),
      all = [];
    let cursor: string | undefined;
    do {
      const page = await f.store.page(parseHome({ cursor }, now));
      expect(page.total).toBe(18);
      expect(page.items.length).toBe(6);
      all.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(all.length).toBe(18);
    expect(new Set(all.map((x) => `${x.kind}:${x.id}`)).size).toBe(18);
    expect(new Set(all.map((x) => x.kind))).toEqual(
      new Set(["movie", "standalone", "series"]),
    );
    expect(all[0]!.publishedAt.endsWith("123456Z")).toBe(true);
    expect(
      all.filter((x) => x.kind === "series").every((x) => x.episodeCount === 1),
    ).toBe(true);
    const literal = await f.store.page(parseHome({ search: "% _ \\" }, now));
    expect(literal.items.length).toBe(1);
    expect(literal.items[0]!.genres).toEqual([]);
    const gs = await f.store.genres(parseHome({}, now, "catalog-genres"));
    expect(gs.items.length).toBe(2);
    expect((await f.legacy.playable({ limit: 100 })).length).toBe(18);
    expect((await f.store.poster("series", f.seriesIds[0]!))?.key).toBe(
      f.posterKeys.get(`series:${f.seriesIds[0]}`),
    );
    await f.db
      .client`UPDATE videos SET published_at='2026-10-02T00:00:00.000002Z' WHERE id=${f.videoIds[0]}::uuid`;
    await f.db
      .client`UPDATE videos SET published_at='2026-10-02T00:00:00.000001Z' WHERE id=${f.videoIds[1]}::uuid`;
    const first = await f.store.page(
      parseHome({ limit: "1", kind: "movie" }, now),
    );
    const second = await f.store.page(
      parseHome({ limit: "1", kind: "movie", cursor: first.nextCursor! }, now),
    );
    expect(first.items[0]!.id).toBe(f.videoIds[0]!);
    expect(second.items[0]!.id).toBe(f.videoIds[1]!);
    await new VideosService(createVideosRepository(f.db.db)).archive(
      f.episodeIds[0]!,
      2,
      "media-admin",
    );
    expect((await f.store.page(parseHome({}, now))).total).toBe(17);
    expect(await f.store.poster("series", f.seriesIds[0]!)).toBeUndefined();
    expect(await f.legacy.seriesCount(f.seriesIds[0]!)).toBe(0);
  } finally {
    await f.close();
  }
}, 60000);

test("large mixed catalog passes >100 series/genre boundaries, one-statement reads and measured EXPLAIN", async () => {
  const f = await publicCatalogFixture({
    videoCount: 6,
    seriesCount: 121,
    genreCount: 101,
    collision: true,
  });
  try {
    let queries = 0;
    const counted = new Proxy(f.db.db, {
      get(target, key) {
        const value = Reflect.get(target, key);
        return typeof value === "function"
          ? (...args: unknown[]) => {
              if (key === "execute") queries++;
              return value.apply(target, args);
            }
          : value;
      },
    }) as ContentDatabase;
    const store = new CatalogHomeStore(counted),
      now = new Date();
    const first = await store.page(parseHome({ limit: "100" }, now));
    expect(queries).toBe(1);
    expect(first.total).toBe(127);
    expect(first.items).toHaveLength(100);
    const second = await store.page(
      parseHome({ limit: "100", cursor: first.nextCursor! }, now),
    );
    expect(queries).toBe(2);
    expect(second.items).toHaveLength(27);
    expect(second.nextCursor).toBeNull();
    expect(
      [...first.items, ...second.items].filter((x) => x.kind === "series"),
    ).toHaveLength(121);
    expect(
      new Set([...first.items, ...second.items].map((x) => `${x.kind}:${x.id}`))
        .size,
    ).toBe(127);
    const g1 = await store.genres(parseHome({}, now, "catalog-genres")),
      g2 = await store.genres(
        parseHome({ cursor: g1.nextCursor! }, now, "catalog-genres"),
      );
    expect(queries).toBe(4);
    expect(g1.items).toHaveLength(100);
    expect(g2.items).toHaveLength(1);
    expect(g2.nextCursor).toBeNull();
    // Many genres on one owner must enrich a single card rather than multiply its rows/count.
    for (const genreId of f.genreIds)
      await f.db
        .client`INSERT INTO video_genres(video_id,genre_id) VALUES (${f.videoIds[0]}::uuid,${genreId}::uuid) ON CONFLICT DO NOTHING`;
    const enriched = await store.page(parseHome({ search: "rain" }, now));
    expect(enriched.total).toBe(1);
    expect(enriched.items[0]!.genres).toHaveLength(101);
    const genreFiltered = await store.page(
      parseHome({ genreId: f.genreIds[100] }, now),
    );
    expect(genreFiltered.total).toBe(2);
    await store.poster("series", f.seriesIds[0]!);
    expect(queries).toBe(7);
    const measured = [];
    for (const input of [
      {},
      { kind: "series" as const },
      { genreId: f.genreIds[100] },
      { search: "portrait" },
    ]) {
      const rows = await f.db.db.execute(
        sql`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${store.statement(parseHome(input, now))}`,
      );
      const raw = rows[0]!["QUERY PLAN"];
      const result = (typeof raw === "string" ? JSON.parse(raw) : raw) as Array<
        Record<string, unknown>
      >;
      expect(typeof result[0]!["Execution Time"]).toBe("number");
      measured.push({
        filter: input,
        planningMs: result[0]!["Planning Time"],
        executionMs: result[0]!["Execution Time"],
      });
    }
    console.log(
      JSON.stringify({
        proof: "public catalog SQL",
        titles: 127,
        series: 121,
        genres: 101,
        pageQueries: 1,
        genresQueries: 1,
        posterLookupQueries: 1,
        explain: measured,
      }),
    );
  } finally {
    await f.close();
  }
}, 180000);

test("snapshot excludes new publication, archive changes count, shared gates hide broken owners and invalidation is after commit", async () => {
  const f = await publicCatalogFixture();
  try {
    const service = new CatalogService(f.legacy, undefined, f.store),
      publisher = new PublicationService(f.db.db, service.invalidate),
      admin = new VideosService(
        createVideosRepository(f.db.db),
        undefined,
        service.invalidate,
      );
    const unpublished = f.videoIds[11]!,
      archived = f.videoIds[3]!;
    await f.db
      .client`UPDATE videos SET publication_status='draft',published_at=null WHERE id=${unpublished}::uuid`;
    expect((await service.home({})).total).toBe(17);
    const now = new Date(),
      first = await f.store.page(parseHome({}, now));
    await Bun.sleep(2);
    await publisher.publish(
      "video",
      unpublished,
      { expectedVersion: 2, idempotencyKey: crypto.randomUUID() },
      "media-admin",
    );
    expect((await service.home({})).total).toBe(18);
    await admin.archive(archived, 2, "media-admin");
    expect((await service.home({})).total).toBe(17);
    const traversed = [...first.items];
    let cursor = first.nextCursor;
    while (cursor) {
      const next = await f.store.page(parseHome({ cursor }, new Date()));
      expect(next.total).toBe(16);
      traversed.push(...next.items);
      cursor = next.nextCursor;
    }
    expect(traversed.some((x) => x.id === unpublished)).toBe(false);
    expect(traversed.some((x) => x.id === archived)).toBe(false);
    expect(new Set(traversed.map((x) => `${x.kind}:${x.id}`)).size).toBe(16);
    const movie = f.videoIds[0]!,
      parent = f.seriesIds[0]!,
      season = f.seasonIds[0]!;
    const before = (await f.store.page(parseHome({}))).total;
    await f.db
      .client`UPDATE seasons SET archived_at=now() WHERE id=${season}::uuid`;
    expect((await f.store.page(parseHome({}))).total).toBe(before - 1);
    expect(await f.store.poster("series", parent)).toBeUndefined();
    expect(await f.legacy.seriesCount(parent)).toBe(0);
    await f.db
      .client`UPDATE seasons SET archived_at=null WHERE id=${season}::uuid`;
    await f.db
      .client`UPDATE media_assets SET generation=generation+1 WHERE series_id=${parent}::uuid AND kind='poster'`;
    expect(await f.store.poster("series", parent)).toBeUndefined();
    expect((await f.store.page(parseHome({}))).total).toBe(before - 1);
    await f.db
      .client`UPDATE media_assets SET generation=generation-1 WHERE series_id=${parent}::uuid AND kind='poster'`;
    // Bun SQL queries are lazy thenables; materialize one before expect.rejects.
    const corruptOwner = async () =>
      await f.db
        .client`UPDATE media_assets SET video_id=${f.videoIds[1]}::uuid WHERE video_id=${movie}::uuid AND kind='source'`;
    await expect(corruptOwner()).rejects.toBeDefined();
    expect(await f.store.poster("movie", movie)).toBeDefined();
    expect((await f.store.page(parseHome({}))).total).toBe(before);
    await f.db
      .client`UPDATE media_jobs SET output_files='[]'::jsonb WHERE id=(SELECT ready_job_id FROM media_assets WHERE id=(SELECT poster_asset_id FROM videos WHERE id=${movie}::uuid))`;
    expect(await f.store.poster("movie", movie)).toBeUndefined();
    expect((await f.store.page(parseHome({}))).total).toBe(before - 1);
    // A rejected write must keep the valid metadata entry; no broad invalidate on failure.
    const cached = await service.home({});
    await expect(
      admin.archive(f.videoIds[1]!, 99, "media-admin"),
    ).rejects.toBeDefined();
    expect((await service.home({})).items).toEqual(cached.items);
  } finally {
    await f.close();
  }
}, 60000);
