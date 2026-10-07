import { expect, test } from "bun:test";
import { publicCatalogFixture } from "./public-catalog-fixture";
import { publicCatalogStorageFixture } from "./public-catalog-storage-fixture";
import {
  CatalogPosterService,
  publicPosterMaxBytes,
} from "../../src/modules/catalog/poster-service";
import { CatalogService } from "../../src/modules/catalog/service";
import { createCatalogModule } from "../../src/modules/catalog";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
test("published private MinIO WebP is served and fresh visibility/profile/size failures never leak output", async () => {
  const s = await publicCatalogStorageFixture();
  const f = await publicCatalogFixture({
    videoCount: 2,
    seriesCount: 1,
    bucket: s.config.bucket,
  });
  try {
    for (const key of f.posterKeys.values()) await s.write(key);
    const service = new CatalogService(f.legacy, undefined, f.store),
      posters = new CatalogPosterService(f.store, s.native, s.config);
    const app = createCatalogModule(service, posters);
    for (const [kind, id] of [
      ["movie", f.videoIds[0]!],
      ["series", f.seriesIds[0]!],
    ] as const) {
      const r = await app.handle(
        new Request(`http://localhost/catalog/${kind}/${id}/poster`),
      );
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toBe("image/webp");
      expect(r.headers.get("cache-control")).toBe("private, no-store");
      expect(new Uint8Array(await r.arrayBuffer())).toEqual(s.image);
    }
    const key = f.posterKeys.get(`movie:${f.videoIds[0]}`)!;
    const unsigned = await fetch(
      `${s.config.endpoint}/${s.config.bucket}/${key}`,
    );
    expect(unsigned.status).toBe(403);
    await service.home({});
    await new VideosService(
      createVideosRepository(f.db.db),
      undefined,
      service.invalidate,
    ).archive(f.videoIds[0]!, 2, "media-admin");
    expect(
      (
        await app.handle(
          new Request(`http://localhost/catalog/movie/${f.videoIds[0]}/poster`),
        )
      ).status,
    ).toBe(404);
    const second = f.posterKeys.get(`movie:${f.videoIds[1]}`)!;
    await s.write(second, new Uint8Array(publicPosterMaxBytes + 1));
    expect(
      (
        await app.handle(
          new Request(`http://localhost/catalog/movie/${f.videoIds[1]}/poster`),
        )
      ).status,
    ).toBe(503);
    await expect(
      new CatalogPosterService(f.store, s.native, {
        ...s.config,
        provider: "r2",
      }).get("series", f.seriesIds[0]!),
    ).rejects.toBeDefined();
    console.log(
      JSON.stringify({
        proof: "public private MinIO WebP",
        posterBytes: s.image.length,
        width: 1080,
        height: 1920,
        maxBytes: publicPosterMaxBytes,
      }),
    );
  } finally {
    await f.close();
    await s.close();
  }
}, 60000);
