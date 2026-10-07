import { expect, test } from "bun:test";
import { publicCatalogFixture } from "./public-catalog-fixture";
import { parseHome } from "../../src/modules/catalog/home-pagination";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
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
