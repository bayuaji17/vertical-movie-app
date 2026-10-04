import { test, expect } from "bun:test";
import type { S3Client } from "bun";
import type { CatalogStore, PlayableRow } from "../catalog/repository";
import { PlaybackService } from "./service";
function fixture(durationMs: number) {
  const source = "01900000-0000-7000-8000-000000000001",
    hls = "01900000-0000-7000-8000-000000000002",
    poster = "01900000-0000-7000-8000-000000000003",
    posterJob = "01900000-0000-7000-8000-000000000004",
    token = "01900000-0000-7000-8000-000000000005";
  const profile = { provider: "minio", bucket: "test-bucket" },
    prefix = "outputs/" + source + "/" + hls + "/" + token + "/",
    clock = new Date("2026-10-04T00:00:00.000Z"),
    signatures: number[] = [];
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
    playable: async () => (allowed ? [row] : []),
    preview: async () => (allowed ? row : undefined),
  } as unknown as CatalogStore;
  const native = {
    presign: (_key: string, options: { expiresIn: number }) => {
      signatures.push(options.expiresIn);
      return "https://example.invalid/payload";
    },
    stat: async () => ({ size: 100 }),
    file: () => ({
      text: async () =>
        '#EXTM3U\n#EXT-X-MAP:URI="init_0.mp4"\n#EXTINF:6,\nsegment_000000.m4s\n#EXT-X-ENDLIST\n',
    }),
  } as unknown as S3Client;
  return {
    service: new PlaybackService(
      store,
      native,
      "https://example.invalid/api",
      profile,
      () => clock,
    ),
    clock,
    signatures,
    revoke: () => {
      allowed = false;
    },
  };
}
test.each([
  [600000, 1200],
  [1800000, 3600],
  [1333, 3],
])(
  "playback duration %ims grants %is including ceiling for fractional seconds",
  async (durationMs, ttl) => {
    const f = fixture(durationMs),
      info = await f.service.info("fixture");
    expect(Date.parse(info.expiresAt) - f.clock.getTime()).toBe(ttl * 1000);
    expect(f.signatures).toEqual([ttl]);
    const playlist = await f.service.playlist("fixture", "0");
    expect(playlist.headers.get("cache-control")).toBe("private, no-store");
    expect(f.signatures).toEqual([ttl, ttl, ttl]);
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
  expect(f.signatures).toEqual([1200]);
});
