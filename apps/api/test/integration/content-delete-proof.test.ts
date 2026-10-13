import { expect, test } from "bun:test";

import { resetMediaDatabase } from "./media-fixture";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { GenresService } from "../../src/modules/genres/service";
import { createGenresRepository } from "../../src/modules/genres/repository";
import { createLogger } from "@repo/log";
import {
  actor,
  attachMedia,
  counts,
  empty,
  sha,
} from "./content-delete-fixture";

async function setup() {
  const database = await resetMediaDatabase();
  const records: Array<Record<string, unknown>> = [];
  let invalidations = 0;
  const log = createLogger("api", {
    config: { level: "debug", format: "json", bodies: false },
    write: (line) => void records.push(JSON.parse(line)),
  });
  const invalidate = () => void invalidations++;
  const videos = new VideosService(
    createVideosRepository(database.db),
    undefined,
    invalidate,
    log,
  );
  const series = new SeriesService(
    createSeriesRepository(database.db),
    undefined,
    invalidate,
    log,
  );
  const genres = new GenresService(createGenresRepository(database.db));
  return {
    database,
    videos,
    series,
    genres,
    records,
    invalidations: () => invalidations,
  };
}
const code = (promise: Promise<unknown>) =>
  promise.then(
    () => "ok",
    (error: { code?: string }) => error.code ?? "error",
  );

test("deleting a draft movie removes every dependent row, records storage tombstones and frees the slug", async () => {
  const t = await setup();
  try {
    const genre = await t.genres.create({ name: "Drama" });
    const video = await t.videos.create(
      {
        kind: "movie",
        title: "Gone Soon",
        slug: "gone-soon",
        genreIds: [genre.id],
      },
      actor,
    );
    const media = await attachMedia(t.database.client, { videoId: video.id });
    await attachMedia(t.database.client, { videoId: video.id }, "poster");
    await t.database
      .client`INSERT INTO content_operations (id,video_id,actor_id,idempotency_key,request_hash,action,result)
      VALUES (${crypto.randomUUID()}::uuid,${video.id}::uuid,${actor},${crypto.randomUUID()}::uuid,${sha},'archive','{}'::jsonb)`;
    expect((await counts(t.database.client)).assets).toBe(2);

    const result = await t.videos.remove(video.id, video.rowVersion, actor);
    expect(result).toMatchObject({
      id: video.id,
      kind: "movie",
      removed: {
        videos: 1,
        assets: 2,
        uploadSessions: 2,
        jobs: 2,
        storageObjects: 6,
      },
    });
    expect(await counts(t.database.client)).toEqual(empty);
    const tombstones = await t.database
      .client`SELECT kind,key FROM media_storage_tombstones ORDER BY key`;
    expect(tombstones.map((r: { key: string }) => r.key)).toContain(
      `sources/${media.assetId}/original`,
    );
    expect(tombstones.map((r: { key: string }) => r.key)).toContain(
      `outputs/${media.assetId}/`,
    );
    expect(tombstones.map((r: { key: string }) => r.key)).toContain(
      `uploads/${media.sessionId}/original`,
    );
    expect(
      tombstones.every((r: { key: string }) => !r.key.startsWith("/")),
    ).toBe(true);
    // The genre itself stays, only its usage disappears.
    expect(
      (await t.database.client`SELECT count(*)::int n FROM genres`)[0].n,
    ).toBe(1);
    expect(t.invalidations()).toBe(1);
    expect(t.records.at(-1)).toMatchObject({
      event: "content.deleted",
      kind: "movie",
      slug: "gone-soon",
      status: "draft",
      actor,
    });
    // Deleting twice is a plain 404, and the slug can be created again.
    expect(await code(t.videos.remove(video.id, video.rowVersion, actor))).toBe(
      "CONTENT_NOT_FOUND",
    );
    expect(
      (
        await t.videos.create(
          { kind: "movie", title: "Gone Soon", slug: "gone-soon" },
          actor,
        )
      ).slug,
    ).toBe("gone-soon");
  } finally {
    await t.database.client.close();
  }
});

test("published, stale and busy videos are refused without removing anything", async () => {
  const t = await setup();
  try {
    const published = await t.videos.create(
      { kind: "movie", title: "Live" },
      actor,
    );
    await t.database
      .client`UPDATE videos SET publication_status='published',published_at=now(),first_published_at=now() WHERE id=${published.id}::uuid`;
    expect(
      await code(t.videos.remove(published.id, published.rowVersion, actor)),
    ).toBe("CONTENT_STATE_CONFLICT");

    const stale = await t.videos.create(
      { kind: "movie", title: "Stale" },
      actor,
    );
    expect(
      await code(t.videos.remove(stale.id, stale.rowVersion + 1, actor)),
    ).toBe("CONTENT_VERSION_CONFLICT");

    const running = await t.videos.create(
      { kind: "movie", title: "Encoding" },
      actor,
    );
    await attachMedia(
      t.database.client,
      { videoId: running.id },
      "source",
      "running",
      "completed",
    );
    expect(
      await code(t.videos.remove(running.id, running.rowVersion, actor)),
    ).toBe("CONTENT_BUSY");

    const uploading = await t.videos.create(
      { kind: "movie", title: "Uploading" },
      actor,
    );
    await attachMedia(
      t.database.client,
      { videoId: uploading.id },
      "source",
      "queued",
      "pending",
    );
    expect(
      await code(t.videos.remove(uploading.id, uploading.rowVersion, actor)),
    ).toBe("CONTENT_BUSY");

    const before = await counts(t.database.client);
    expect(before.videos).toBe(4);
    expect(before.assets).toBe(2);
    expect(
      (
        await t.database
          .client`SELECT count(*)::int n FROM media_storage_tombstones`
      )[0].n,
    ).toBe(0);
    expect(t.invalidations()).toBe(0);
  } finally {
    await t.database.client.close();
  }
});

test("an archived video that was once published can be deleted", async () => {
  const t = await setup();
  try {
    const video = await t.videos.create(
      { kind: "standalone", title: "Old" },
      actor,
    );
    await attachMedia(t.database.client, { videoId: video.id });
    await t.database
      .client`UPDATE videos SET publication_status='archived',archived_at=now(),published_at=NULL,first_published_at=now() WHERE id=${video.id}::uuid`;
    const row = (
      await t.database
        .client`SELECT row_version FROM videos WHERE id=${video.id}::uuid`
    )[0];
    const result = await t.videos.remove(video.id, row.row_version, actor);
    expect(result.kind).toBe("standalone");
    expect(await counts(t.database.client)).toEqual(empty);
    expect(t.records.at(-1)).toMatchObject({
      status: "archived",
      everPublished: true,
    });
  } finally {
    await t.database.client.close();
  }
});

test("deleting a series removes its seasons, episodes, genres and every asset", async () => {
  const t = await setup();
  try {
    const genre = await t.genres.create({ name: "Mystery" });
    const created = await t.series.create(
      { title: "Show", slug: "show", genreIds: [genre.id] },
      actor,
    );
    const season2 = await t.series.createSeason(
      created.series.id,
      { seasonNumber: 2 },
      actor,
    );
    await attachMedia(
      t.database.client,
      { seriesId: created.series.id },
      "poster",
    );
    const episodes = [];
    for (const [season, number] of [
      [created.defaultSeason.id, 1],
      [created.defaultSeason.id, 2],
      [season2.id, 1],
    ] as const) {
      const episode = await t.videos.create(
        {
          kind: "episode",
          title: `Episode ${episodes.length + 1}`,
          seasonId: season,
          episodeNumber: number,
        },
        actor,
      );
      await attachMedia(t.database.client, { videoId: episode.id });
      episodes.push(episode);
    }
    // One episode is "published" under the draft series; it is hidden, so it goes too.
    await t.database
      .client`UPDATE videos SET publication_status='published',published_at=now(),first_published_at=now() WHERE id=${episodes[0]!.id}::uuid`;

    const result = await t.series.remove(
      created.series.id,
      created.series.rowVersion,
      actor,
    );
    expect(result).toMatchObject({
      kind: "series",
      removed: { series: 1, seasons: 2, videos: 3, assets: 4 },
    });
    expect(await counts(t.database.client)).toEqual(empty);
    expect(
      (await t.database.client`SELECT count(*)::int n FROM genres`)[0].n,
    ).toBe(1);
    expect(t.records.at(-1)).toMatchObject({
      event: "content.deleted",
      kind: "series",
      slug: "show",
    });
  } finally {
    await t.database.client.close();
  }
});

test("a published series is refused, an archived one is deleted, and busy episodes block the whole series", async () => {
  const t = await setup();
  try {
    const live = await t.series.create({ title: "Live Show" }, actor);
    await t.database
      .client`UPDATE series SET publication_status='published',published_at=now(),first_published_at=now() WHERE id=${live.series.id}::uuid`;
    expect(
      await code(
        t.series.remove(live.series.id, live.series.rowVersion, actor),
      ),
    ).toBe("CONTENT_STATE_CONFLICT");

    const busy = await t.series.create({ title: "Busy Show" }, actor);
    const episode = await t.videos.create(
      {
        kind: "episode",
        title: "E1",
        seasonId: busy.defaultSeason.id,
        episodeNumber: 1,
      },
      actor,
    );
    await attachMedia(
      t.database.client,
      { videoId: episode.id },
      "source",
      "running",
    );
    expect(
      await code(
        t.series.remove(busy.series.id, busy.series.rowVersion, actor),
      ),
    ).toBe("CONTENT_BUSY");
    expect((await counts(t.database.client)).videos).toBe(1);

    const old = await t.series.create({ title: "Old Show" }, actor);
    await t.database
      .client`UPDATE series SET archived_at=now(),first_published_at=now() WHERE id=${old.series.id}::uuid`;
    const version = (
      await t.database
        .client`SELECT row_version FROM series WHERE id=${old.series.id}::uuid`
    )[0].row_version;
    expect(
      (await t.series.remove(old.series.id, version, actor)).removed.series,
    ).toBe(1);
  } finally {
    await t.database.client.close();
  }
});

test("a season is deleted with its episodes, but published episodes of a published series block it", async () => {
  const t = await setup();
  try {
    const created = await t.series.create({ title: "Seasoned" }, actor);
    const season2 = await t.series.createSeason(
      created.series.id,
      { seasonNumber: 2 },
      actor,
    );
    const keep = await t.videos.create(
      {
        kind: "episode",
        title: "Keep",
        seasonId: created.defaultSeason.id,
        episodeNumber: 1,
      },
      actor,
    );
    const drop = await t.videos.create(
      {
        kind: "episode",
        title: "Drop",
        seasonId: season2.id,
        episodeNumber: 1,
      },
      actor,
    );
    await attachMedia(t.database.client, { videoId: drop.id });
    await attachMedia(t.database.client, { videoId: keep.id });

    const removed = await t.series.removeSeason(
      season2.id,
      season2.rowVersion,
      actor,
    );
    expect(removed).toMatchObject({
      kind: "season",
      removed: { seasons: 1, videos: 1, assets: 1 },
    });
    const left = await counts(t.database.client);
    expect(left).toMatchObject({ videos: 1, seasons: 1, series: 1, assets: 1 });

    // Published series with a published episode: the season must be handled first.
    await t.database
      .client`UPDATE series SET publication_status='published',published_at=now(),first_published_at=now() WHERE id=${created.series.id}::uuid`;
    await t.database
      .client`UPDATE videos SET publication_status='published',published_at=now(),first_published_at=now() WHERE id=${keep.id}::uuid`;
    expect(
      await code(
        t.series.removeSeason(
          created.defaultSeason.id,
          created.defaultSeason.rowVersion,
          actor,
        ),
      ),
    ).toBe("CONTENT_STATE_CONFLICT");
    expect(
      await code(
        t.series.removeSeason(
          created.defaultSeason.id,
          created.defaultSeason.rowVersion + 5,
          actor,
        ),
      ),
    ).toBe("CONTENT_VERSION_CONFLICT");
    expect((await counts(t.database.client)).videos).toBe(1);
  } finally {
    await t.database.client.close();
  }
});
