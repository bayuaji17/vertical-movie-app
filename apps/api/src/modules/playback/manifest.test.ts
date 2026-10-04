import { test, expect } from "bun:test";
import { rewriteManifest } from "./manifest";
test("master variants use API authorization while init and segments use direct scoped signatures", () => {
  const files = [
    "master.m3u8",
    "0/index.m3u8",
    "0/init_0.mp4",
    "0/segment_000000.m4s",
  ];
  expect(
    rewriteManifest(
      "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1200000\n0/index.m3u8\n",
      "master.m3u8",
      files,
      (i) => "/api/variant/" + i,
      (k) => "signed:" + k,
    ),
  ).toContain("/api/variant/0");
  expect(
    rewriteManifest(
      '#EXTM3U\n#EXT-X-MAP:URI="init_0.mp4"\n#EXTINF:6,\nsegment_000000.m4s\n#EXT-X-ENDLIST',
      "0/index.m3u8",
      files,
      (i) => i,
      (k) => "signed:" + k,
    ),
  ).toContain('URI="signed:0/init_0.mp4"');
});
test("manifest signing rejects traversal, external URIs and objects outside the verified output set", () => {
  for (const uri of [
    "../original",
    "http://evil/segment.m4s",
    "/sources/original",
    "segment_missing.m4s",
    "0//segment.m4s",
  ]) {
    expect(() =>
      rewriteManifest(
        "#EXTM3U\n" + uri,
        "master.m3u8",
        [],
        (i) => i,
        (k) => k,
      ),
    ).toThrow();
  }
});
