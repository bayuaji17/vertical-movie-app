import { test, expect } from "bun:test";
import type { S3Client } from "bun";
import type { CatalogStore, PlayableRow } from "../catalog/repository";
import type { UrlLifetimes } from "../../config/playback-env";
import { PlaybackService } from "./service";
function fixture(durationMs: number, lifetimes?: UrlLifetimes) {
  const source = "01900000-0000-7000-8000-000000000001",
    hls = "01900000-0000-7000-8000-000000000002",
    poster = "01900000-0000-7000-8000-000000000003",
    posterJob = "01900000-0000-7000-8000-000000000004",
    token = "01900000-0000-7000-8000-000000000005";
  const profile = { provider: "minio", bucket: "test-bucket" },
    prefix = "outputs/" + source + "/" + hls + "/" + token + "/",
    clock = new Date("2026-10-04T00:00:00.000Z"),
    signatures: number[] = [],
    keys: string[] = [];
  let storageReads = 0,
    visibilityReads = 0;
  const row = {
    video: { id: source, slug: "fixture", title: "Fixture" },
    source: { id: source, ...profile, facts: { durationMs } },
    poster: { id: poster, ...profile },
    hls: {
      id: hls,
      outputPrefix: prefix,
      outputFiles: [
        "master.m3u8",
        "0/index.m3u8",
        "0/init_0.mp4",
        "0/segment_000000.m4s",
      ],
    },
    posterJob: {
      id: posterJob,
      outputPrefix: "outputs/" + poster + "/" + posterJob + "/" + token + "/",
      outputFiles: ["poster.webp"],
    },
  } as unknown as PlayableRow;
  let allowed = true;
  const store = {
    playable: async () => {
      visibilityReads++;
      return allowed ? [row] : [];
    },
    preview: async () => (allowed ? row : undefined),
  } as unknown as CatalogStore;
  const native = {
    presign: (key: string, options: { expiresIn: number }) => {
      signatures.push(options.expiresIn);
      keys.push(key);
      return "https://example.invalid/payload";
    },
    stat: async () => {
      storageReads++;
      return { size: 100 };
    },
    file: () => {
      storageReads++;
      return {
        text: async () =>
          '#EXTM3U\n#EXT-X-MAP:URI="init_0.mp4"\n#EXTINF:6,\nsegment_000000.m4s\n#EXT-X-ENDLIST\n',
      };
    },
  } as unknown as S3Client;
  return {
    service: new PlaybackService(
      store,
      native,
      "https://example.invalid/api",
      profile,
      () => clock,
      lifetimes,
    ),
    clock,
    signatures,
    keys,
    reads: () => ({ storage: storageReads, visibility: visibilityReads }),
    row,
    revoke: () => {
      allowed = false;
    },
  };
}
// Video URLs live max(2 x duration, 1 h); posters have their own 24 h lifetime.
test.each([
  [600000, 3600],
  [1800000, 3600],
  [1333, 3600],
])(
  "playback duration %ims grants %is (at least an hour); the poster is signed for a day",
  async (durationMs, ttl) => {
    const f = fixture(durationMs),
      info = await f.service.info("fixture");
    expect(Date.parse(info.expiresAt) - f.clock.getTime()).toBe(ttl * 1000);
    expect(f.signatures).toEqual([86400]);
    const playlist = await f.service.playlist("fixture", "0");
    expect(playlist.headers.get("cache-control")).toBe("private, no-store");
    expect(f.signatures).toEqual([86400, ttl, ttl]);
  },
);
test.each([
  // [duration ms, configured HLS minimum s, expected effective s]
  [600000, 60, 1200], // 2 x duration wins over a small minimum
  [10000, 60, 60], // the minimum wins for a short video
  [1333, 7200, 7200],
])(
  "the HLS lifetime is max(2 x duration, minimum): %ims with minimum %is is %is",
  async (durationMs, hlsMinSeconds, expected) => {
    const f = fixture(durationMs, { posterSeconds: 86400, hlsMinSeconds }),
      info = await f.service.info("fixture");
    expect(Date.parse(info.expiresAt) - f.clock.getTime()).toBe(
      expected * 1000,
    );
    await f.service.playlist("fixture", "0");
    expect(f.signatures.slice(1)).toEqual([expected, expected]);
  },
);
test("renewal reauthorizes catalog visibility before issuing any new signature", async () => {
  const f = fixture(600000);
  await f.service.info("fixture");
  f.revoke();
  await expect(f.service.info("fixture")).rejects.toMatchObject({
    httpStatus: 404,
  });
  await expect(f.service.playlist("fixture", "0")).rejects.toMatchObject({
    httpStatus: 404,
  });
  expect(f.signatures).toEqual([86400]);
});
test.each([
  [600000, 86400],
  [1800000, 86400],
  [1333, 86400],
])(
  "poster signs only verified WebP with duration %ims for %is without reading storage",
  async (duration, ttl) => {
    const f = fixture(duration);
    const result = await f.service.poster("fixture");
    expect(Object.keys(result).sort()).toEqual([
      "expiresAt",
      "posterUrl",
      "videoId",
    ]);
    expect(f.keys).toEqual([f.row.posterJob.outputPrefix + "poster.webp"]);
    expect(f.signatures).toEqual([ttl]);
    expect(Date.parse(result.expiresAt) - f.clock.getTime()).toBe(ttl * 1000);
    await f.service.poster("fixture");
    expect(f.reads()).toEqual({ storage: 0, visibility: 2 });
    f.revoke();
    await expect(f.service.poster("fixture")).rejects.toMatchObject({
      httpStatus: 404,
    });
    expect(f.keys.length).toBe(2);
  },
);
test("the poster lifetime is configurable and independent of the video duration", async () => {
  for (const [duration, seconds] of [
    [1333, 120],
    [1800000, 604800],
  ] as const) {
    const f = fixture(duration, {
      posterSeconds: seconds,
      hlsMinSeconds: 3600,
    });
    const result = await f.service.poster("fixture");
    expect(f.signatures).toEqual([seconds]);
    expect(Date.parse(result.expiresAt) - f.clock.getTime()).toBe(
      seconds * 1000,
    );
  }
});
test("poster refuses invalid profile, namespace, output and verified duration before signing", async () => {
  for (const mutate of [
    (r: PlayableRow) => {
      r.source.provider = "r2";
    },
    (r: PlayableRow) => {
      r.poster.bucket = "wrong";
    },
    (r: PlayableRow) => {
      r.posterJob.outputPrefix += "../";
    },
    (r: PlayableRow) => {
      r.posterJob.outputPrefix = "outputs/another/job/token/";
    },
    (r: PlayableRow) => {
      r.posterJob.outputFiles = ["original.jpg"];
    },
    (r: PlayableRow) => {
      r.source.facts = { durationMs: 0 };
    },
    (r: PlayableRow) => {
      r.source.facts = { durationMs: 1800001 };
    },
    (r: PlayableRow) => {
      r.hls.outputPrefix = "outputs/wrong/";
    },
  ]) {
    const f = fixture(1000);
    mutate(f.row);
    await expect(f.service.poster("fixture")).rejects.toMatchObject({
      httpStatus: 503,
    });
    expect(f.keys).toEqual([]);
    expect(f.reads().storage).toBe(0);
  }
  await expect(new PlaybackService().poster("fixture")).rejects.toMatchObject({
    httpStatus: 503,
  });
});
test("invalid profile, output, duration and poster fail before any signing", async () => {
  for (const mutate of [
    (r: PlayableRow) => {
      r.source.bucket = "another";
    },
    (r: PlayableRow) => {
      r.hls.outputPrefix = "outputs/wrong/";
    },
    (r: PlayableRow) => {
      r.source.facts = { durationMs: 1800001 };
    },
    (r: PlayableRow) => {
      r.posterJob.outputFiles = [];
    },
  ]) {
    const f = fixture(1000);
    mutate(f.row);
    await expect(f.service.info("fixture", true)).rejects.toMatchObject({
      httpStatus: 503,
    });
    expect(f.signatures).toEqual([]);
  }
});
