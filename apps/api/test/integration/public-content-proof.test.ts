import { expect, test } from "bun:test";
import { publicCatalogFixture } from "./public-catalog-fixture";
import { PublicContentStore } from "../../src/modules/catalog/content-repository";
import { parseEpisodes } from "../../src/modules/catalog/content-pagination";
import { CatalogService } from "../../src/modules/catalog/service";
import { createCatalogModule } from "../../src/modules/catalog";
import { sql } from "drizzle-orm";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { createPublicContentBrowserFixture } from "./public-content-browser-fixture";

test("detail, watch and episode lists share current-generation and owner gates", async () => {
  const f = await publicCatalogFixture({
    videoCount: 1,
    seriesCount: 1,
    genreCount: 0,
  });
  try {
    const store = new PublicContentStore(f.db.db, f.store),
      parent = "series-" + f.seriesIds[0],
      episode = "episode-" + f.episodeIds[0];
    expect((await store.watch(episode, new Date()))?.id).toBe(f.episodeIds[0]!);
    await f.db
      .client`UPDATE media_jobs SET generation=2 WHERE id=(SELECT ready_job_id FROM media_assets WHERE id=(SELECT source_asset_id FROM videos WHERE id=${f.episodeIds[0]}::uuid))`;
    expect(await store.watch(episode, new Date())).toBeUndefined();
    expect(await store.detail("series", parent, new Date())).toBeUndefined();
    await expect(
      store.episodes(parseEpisodes(parent, {}, new Date())),
    ).rejects.toMatchObject({ httpStatus: 404 });
    await f.db
      .client`UPDATE media_jobs SET generation=1 WHERE id=(SELECT ready_job_id FROM media_assets WHERE id=(SELECT source_asset_id FROM videos WHERE id=${f.episodeIds[0]}::uuid))`;
    const reparent = async () => {
      await f.db
        .client`UPDATE media_assets SET video_id=${f.videoIds[0]}::uuid WHERE id=(SELECT source_asset_id FROM videos WHERE id=${f.episodeIds[0]}::uuid)`;
    };
    await expect(reparent()).rejects.toMatchObject({ errno: "23503" });
    expect((await store.watch(episode, new Date()))?.id).toBe(f.episodeIds[0]!);
    expect(
      (await store.episodes(parseEpisodes(parent, {}, new Date()))).total,
    ).toBe(1);
    await f.db
      .client`UPDATE media_jobs SET generation=2 WHERE id=(SELECT ready_job_id FROM media_assets WHERE id=(SELECT poster_asset_id FROM series WHERE id=${f.seriesIds[0]}::uuid))`;
    expect(await store.watch(episode, new Date())).toBeUndefined();
    await expect(
      store.episodes(parseEpisodes(parent, {}, new Date())),
    ).rejects.toMatchObject({ httpStatus: 404 });
    expect(
      (await store.detail("movie", "movie-" + f.videoIds[0], new Date()))?.id,
    ).toBe(f.videoIds[0]!);
  } finally {
    await f.close();
  }
}, 600000);

test("public content traverses 103 sparse episodes across seasons with stable scoped cursors", async () => {
  const f = await publicCatalogFixture({ videoCount: 7, seriesCount: 2 });
  try {
    const slug = "series-" + f.seriesIds[0],
      other = "series-" + f.seriesIds[1];
    const season2 = crypto.randomUUID();
    await f.db
      .client`INSERT INTO seasons(id,series_id,season_number,created_by,updated_by) VALUES (${season2}::uuid,${f.seriesIds[0]}::uuid,2,'media-admin','media-admin')`;
    for (let n = 2; n <= 103; n++)
      await f.createEpisode(
        n,
        n <= 60 ? f.seasonIds[0]! : season2,
        n <= 60 ? n * 2 : (n - 60) * 2,
      );
    const store = new PublicContentStore(f.db.db, f.store),
      service = new CatalogService(f.legacy, undefined, f.store, store),
      app = createCatalogModule(service);
    expect(
      (await store.detail("movie", "movie-" + f.videoIds[0], new Date()))?.kind,
    ).toBe("movie");
    expect(
      (
        await store.detail(
          "standalone",
          "standalone-" + f.videoIds[6],
          new Date(),
        )
      )?.kind,
    ).toBe("standalone");
    expect(
      await store.detail("standalone", "movie-" + f.videoIds[0], new Date()),
    ).toBeUndefined();
    expect((await store.detail("series", slug, new Date()))?.kind).toBe(
      "series",
    );
    const first = await store.episodes(
      parseEpisodes(slug, { limit: "100" }, new Date()),
    );
    expect(first.total).toBe(103);
    expect(first.items).toHaveLength(100);
    const last = await store.episodes(
      parseEpisodes(
        slug,
        { limit: "100", cursor: first.nextCursor! },
        new Date(),
      ),
    );
    expect(last.items).toHaveLength(3);
    expect(last.nextCursor).toBeNull();
    const all = [...first.items, ...last.items];
    expect(new Set(all.map((x) => x.id)).size).toBe(103);
    expect(all[59]!.seasonNumber).toBe(1);
    expect(all[60]!.seasonNumber).toBe(2);
    expect(() =>
      parseEpisodes(
        other,
        { limit: "100", cursor: first.nextCursor! },
        new Date(),
      ),
    ).toThrow("Cursor does not match this Series query.");
    const forged = parseEpisodes(
      slug,
      { limit: "100", cursor: first.nextCursor! },
      new Date(),
    );
    await expect(
      store.episodes({ ...forged, seriesId: f.seriesIds[1]! }),
    ).rejects.toMatchObject({ httpStatus: 422 });
    const defaultPage = await service.episodes(slug, {});
    expect(defaultPage.items).toHaveLength(20);
    const cursor = defaultPage.nextCursor!;
    await f.createEpisode(104, season2, 200);
    const afterNew = await store.episodes(
      parseEpisodes(slug, { cursor }, new Date()),
    );
    expect(afterNew.total).toBe(103);
    const hidden = all[25]!;
    await new VideosService(
      createVideosRepository(f.db.db),
      undefined,
      service.invalidate,
    ).archive(hidden.id, 2, "media-admin");
    const afterHide = await store.episodes(
      parseEpisodes(slug, { cursor }, new Date()),
    );
    expect(afterHide.total).toBe(102);
    expect(afterHide.items.some((x) => x.id === hidden.id)).toBe(false);
    const next = await service.next(all[59]!.slug);
    expect(next.seasonNumber).toBe(2);
    expect(next.episodeNumber).toBe(2);
    expect((await store.watch(all[60]!.slug, new Date()))?.seriesSlug).toBe(
      slug,
    );
    await f.db
      .client`UPDATE seasons SET archived_at=now() WHERE id=${season2}::uuid`;
    service.invalidate();
    expect(await store.watch(all[60]!.slug, new Date())).toBeUndefined();
    expect((await service.episodes(slug, {})).total).toBe(59);
    // Parent visibility fixture; published Series archive is not a supported command flow.
    await f.db
      .client`UPDATE series SET publication_status='unpublished',published_at=null,archived_at=now(),row_version=row_version+1 WHERE id=${f.seriesIds[0]}::uuid`;
    service.invalidate();
    expect(
      (
        await app.handle(
          new Request("http://test/catalog/details/series/" + slug),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await app.handle(
          new Request("http://test/catalog/series/" + slug + "/episodes"),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await app.handle(
          new Request("http://test/catalog/watch/" + all[0]!.slug),
        )
      ).status,
    ).toBe(404);
  } finally {
    await f.close();
  }
}, 600000);

test("direct Series lookup reaches eligible titles beyond the legacy 100-parent cap in one SQL read", async () => {
  const f = await publicCatalogFixture({
    videoCount: 0,
    seriesCount: 121,
    genreCount: 0,
  });
  try {
    const capped = new Set((await f.legacy.seriesList()).map((x) => x.id)),
      id = f.seriesIds.find((x) => !capped.has(x))!;
    let reads = 0;
    const counted = new Proxy(f.db.db, {
      get(target, key) {
        const v = Reflect.get(target, key);
        return key === "execute"
          ? (...args: unknown[]) => {
              reads++;
              return v.apply(target, args);
            }
          : typeof v === "function"
            ? v.bind(target)
            : v;
      },
    });
    const store = new PublicContentStore(counted);
    const detail = await store.detail("series", "series-" + id, new Date());
    expect(capped.size).toBe(100);
    expect(detail?.id).toBe(id);
    expect(reads).toBe(1);
    const page = await store.episodes(
      parseEpisodes("series-" + id, {}, new Date()),
    );
    expect(page.total).toBe(1);
    expect(reads).toBe(2);
    await f.db.db.execute(
      sql`UPDATE media_jobs SET state='failed' WHERE id=(SELECT ready_job_id FROM media_assets WHERE id=(SELECT poster_asset_id FROM series WHERE id=${id}::uuid))`,
    );
    expect(
      await store.detail("series", "series-" + id, new Date()),
    ).toBeUndefined();
    await expect(
      store.episodes(parseEpisodes("series-" + id, {}, new Date())),
    ).rejects.toMatchObject({ httpStatus: 404 });
  } finally {
    await f.close();
  }
}, 600000);

test("actual FFmpeg HLS uses private signed init/segments and denies fresh playback after archive", async () => {
  const f = await createPublicContentBrowserFixture();
  try {
    f.setWebOrigin("http://127.0.0.1:59999");
    const p = f.proof(),
      request = (path: string) => f.handle(new Request("http://test" + path));
    const metadata = await request("/catalog/watch/" + p.movie);
    expect(metadata.status).toBe(200);
    expect(JSON.stringify(await metadata.json())).not.toMatch(
      /masterUrl|posterUrl|X-Amz|outputPrefix|secret/,
    );
    const capability = await request("/videos/" + p.movie + "/playback");
    expect(capability.status).toBe(200);
    const info = await capability.json();
    expect(info.masterUrl).toBe(
      "http://127.0.0.1:59999/api/playback/videos/" + p.movie + "/master.m3u8",
    );
    const master = await request(
      "/playback/videos/" + p.movie + "/master.m3u8",
    );
    expect(master.headers.get("cache-control")).toBe("private, no-store");
    const text = await master.text(),
      variant = text.split("\n").find((line) => line.startsWith("http"))!;
    const media = await request(
      new URL(variant).pathname.replace(/^\/api/, ""),
    );
    const manifest = await media.text();
    const init = manifest.match(/URI="([^"]+)"/)![1]!,
      segment = manifest.split("\n").find((line) => line.startsWith("http"))!;
    for (const signed of [init, segment, info.posterUrl]) {
      expect((await fetch(signed)).status).toBe(200);
      const unsigned = new URL(signed);
      unsigned.search = "";
      expect((await fetch(unsigned)).status).toBe(403);
    }
    expect(p.hlsFiles).toBeGreaterThan(4);
    expect(f.proof().authReads).toBe(0);
    await f.control({ archive: p.movie.slice("movie-".length) });
    expect((await request("/videos/" + p.movie + "/playback")).status).toBe(
      404,
    );
    expect(
      (await request("/playback/videos/" + p.movie + "/master.m3u8")).status,
    ).toBe(404);
  } finally {
    await f.close();
  }
}, 600000);
