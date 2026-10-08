import { expect, test } from "bun:test";
import type { S3Client } from "bun";
import { publicCatalogFixture } from "./public-catalog-fixture";
import { publicCatalogStorageFixture } from "./public-catalog-storage-fixture";
import { CatalogService } from "../../src/modules/catalog/service";
import { PlaybackService } from "../../src/modules/playback/service";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { createApp } from "../../src/app";

test("Film/Standalone SQL traversal, legacy compatibility, mutation invalidation and private signed poster proof", async () => {
  const storage = await publicCatalogStorageFixture();
  const f = await publicCatalogFixture({
    videoCount: 49,
    seriesCount: 25,
    bucket: storage.config.bucket,
  });
  try {
    await f.db
      .client`UPDATE videos SET created_at='2026-10-08T00:00:00.000Z'::timestamptz`;
    await f.db
      .client`UPDATE videos SET publication_status='archived',published_at=null,archived_at=now() WHERE id IN (${f.videoIds[0]}::uuid,${f.videoIds[6]}::uuid)`;
    await f.db
      .client`UPDATE videos SET publication_status='draft',published_at=null WHERE id=${f.videoIds[7]}::uuid`;
    await f.db
      .client`UPDATE media_assets SET state='failed' WHERE id=(SELECT source_asset_id FROM videos WHERE id=${f.videoIds[8]}::uuid)`;
    // Source originals may be deleted after verification; durable output remains playable.
    await f.db
      .client`UPDATE media_assets SET deleted_at=now() WHERE id=(SELECT source_asset_id FROM videos WHERE id=${f.videoIds[9]}::uuid)`;
    await f.db
      .client`UPDATE series SET publication_status='draft',published_at=null WHERE id=${f.seriesIds[0]}::uuid`;
    await f.db
      .client`UPDATE seasons SET archived_at=now() WHERE id=${f.seasonIds[1]}::uuid`;
    const service = new CatalogService(f.legacy),
      counts: number[] = [],
      ids: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await service.list({ kinds: "standalone,movie", cursor });
      counts.push(page.items.length);
      ids.push(...page.items.map((v) => v.id));
      expect(page.items.every((v) => v.kind !== "episode")).toBe(true);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(counts).toEqual([20, 20, 5]);
    expect(new Set(ids).size).toBe(45);
    const expected = [...f.videoIds]
      .filter(
        (id) =>
          ![
            f.videoIds[0],
            f.videoIds[6],
            f.videoIds[7],
            f.videoIds[8],
          ].includes(id),
      )
      .sort()
      .reverse();
    expect(ids).toEqual(expected);
    expect(ids).toContain(f.videoIds[9]!);
    const films = await service.list({ kinds: "movie" });
    expect(films.items.length).toBe(5);
    const standalone = await service.list({ kinds: "standalone" });
    expect(standalone.items.length).toBe(20);
    await expect(
      service.list({ kinds: "movie", cursor: standalone.nextCursor! }),
    ).rejects.toMatchObject({ httpStatus: 422 });
    expect(
      (await service.list({ kinds: "movie,standalone" })).items.map(
        (v) => v.id,
      ),
    ).toEqual(ids.slice(0, 20));
    const legacy = await service.list({ limit: "100" });
    expect(legacy.items.length).toBe(68);
    expect(legacy.items.some((v) => v.kind === "episode")).toBe(true);
    const old = await service.list({ limit: "1" });
    expect(
      (await service.list({ limit: "1", cursor: old.nextCursor! })).items[0]
        ?.id,
    ).not.toBe(old.items[0]?.id);

    const selected = (await service.list({ kinds: "movie,standalone" }))
      .items[0]!;
    const posterKey = f.posterKeys.get(`${selected.kind}:${selected.id}`)!;
    await storage.write(posterKey);
    await f.db
      .client`UPDATE media_assets SET facts=jsonb_set(facts,'{durationMs}','1333') WHERE id=(SELECT source_asset_id FROM videos WHERE id=${selected.id}::uuid)`;
    const signatures: string[] = [];
    const native = {
      presign: (key: string, options: { expiresIn: number }) => {
        signatures.push(key);
        return storage.native.presign(key, options);
      },
    } as unknown as S3Client;
    const playback = new PlaybackService(
      f.legacy,
      native,
      "http://web.test/api",
      storage.config,
    );
    let authReads = 0;
    const app = createApp({
      catalogService: service,
      playbackService: playback,
      requestLogger: { write: () => {} },
      getSession: async () => {
        authReads++;
        return null;
      },
    });
    const response = await app.handle(
      new Request(`http://test/videos/${selected.slug}/poster`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const cover = await response.json();
    expect(cover.videoId).toBe(selected.id);
    expect(new URL(cover.posterUrl).searchParams.get("X-Amz-Expires")).toBe(
      "3",
    );
    const object = await fetch(cover.posterUrl);
    expect(object.status).toBe(200);
    expect(object.headers.get("content-type")).toBe("image/webp");
    expect(new Uint8Array(await object.arrayBuffer())).toEqual(storage.image);
    expect(signatures).toEqual([posterKey]);
    const admin = new VideosService(
      createVideosRepository(f.db.db),
      undefined,
      service.invalidate,
    );
    await admin.archive(selected.id, 2, "media-admin");
    expect(
      (await service.list({ kinds: "movie,standalone" })).items.some(
        (v) => v.id === selected.id,
      ),
    ).toBe(false);
    const hidden = await app.handle(
      new Request(`http://test/videos/${selected.slug}/poster`),
    );
    expect(hidden.status).toBe(404);
    expect(signatures.length).toBe(1);
    expect(authReads).toBe(0);
    // The already issued capability remains valid until its declared expiry.
    expect((await fetch(cover.posterUrl)).status).toBe(200);
    const other = films.items.find((v) => v.id !== selected.id)!;
    await f.db
      .client`UPDATE media_assets SET bucket='wrong-bucket' WHERE id=(SELECT poster_asset_id FROM videos WHERE id=${other.id}::uuid)`;
    expect(
      (await app.handle(new Request(`http://test/videos/${other.slug}/poster`)))
        .status,
    ).toBe(503);
    expect(signatures.length).toBe(1);
    for (const id of ids)
      await f.db
        .client`UPDATE videos SET publication_status='archived',published_at=null,archived_at=now() WHERE id=${id}::uuid`;
    service.invalidate();
    expect(await service.list({ kinds: "movie,standalone" })).toEqual({
      items: [],
      nextCursor: null,
    });
  } finally {
    await f.close();
    await storage.close();
  }
}, 120000);
