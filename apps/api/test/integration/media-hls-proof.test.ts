import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { runMediaProcess } from "../../src/workers/process";
import { probe, videoFacts } from "../../src/workers/probe";
import { transcodeHls, transcodePoster } from "../../src/workers/transcode";
const root = "/var/tmp/vertical-movie-hls-proof-";
test("real FFmpeg creates complete portrait adaptive fMP4 HLS with optional AAC", async () => {
  const dir = await mkdtemp(root);
  try {
    const source = join(dir, "source.mp4");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1080x1920:rate=60",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000",
        "-t",
        "2",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-threads",
        "1",
        "-c:a",
        "aac",
        source,
      ],
      { timeoutSeconds: 60 },
    );
    const facts = videoFacts(
      await probe(source),
      "movie",
      "source.mp4",
      Bun.file(source).size,
    );
    expect(facts.hasAudio).toBe(true);
    expect(facts.fps).toBe(30);
    const result = await transcodeHls(source, join(dir, "hls"), facts, {
      timeoutSeconds: 60,
    });
    expect(result.tiers).toHaveLength(3);
    expect(result.files.filter((f) => f.endsWith(".m3u8"))).toHaveLength(4);
    expect(result.files.filter((f) => f.endsWith(".m4s"))).toHaveLength(3);
  } finally {
    if (!dir.startsWith(root)) throw new Error("Unsafe proof cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 120000);
test("narrow 480p no-audio source stays native without upscale", async () => {
  const dir = await mkdtemp(root);
  try {
    const source = join(dir, "source.mp4");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=480x854:rate=24",
        "-t",
        "2",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-threads",
        "1",
        source,
      ],
      { timeoutSeconds: 30 },
    );
    const facts = videoFacts(
      await probe(source),
      "episode",
      "source.mp4",
      Bun.file(source).size,
    );
    expect(facts.hasAudio).toBe(false);
    const result = await transcodeHls(source, join(dir, "hls"), facts, {
      timeoutSeconds: 30,
    });
    expect(result.tiers[0].width).toBe(480);
    const out = await probe(join(dir, "hls/0/index.m3u8"));
    expect(out.streams.some((s) => s.codec_type === "audio")).toBe(false);
    expect(out.streams[0].width).toBe(480);
  } finally {
    if (!dir.startsWith(root)) throw new Error("Unsafe proof cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
test("poster normalizes larger still image and rejects smaller image", async () => {
  const dir = await mkdtemp(root);
  try {
    const source = join(dir, "poster.png"),
      out = join(dir, "poster.webp");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=blue:size=2160x3840",
        "-frames:v",
        "1",
        source,
      ],
      { timeoutSeconds: 30 },
    );
    expect(
      await transcodePoster(source, out, "poster.png", Bun.file(source).size),
    ).toEqual({ width: 1080, height: 1920, codec: "webp" });
    const small = join(dir, "small.png");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=blue:size=720x1280",
        "-frames:v",
        "1",
        small,
      ],
      { timeoutSeconds: 30 },
    );
    await expect(
      transcodePoster(small, out, "small.png", Bun.file(small).size),
    ).rejects.toMatchObject({ code: "MEDIA_INVALID_POSTER_DIMENSIONS" });
  } finally {
    if (!dir.startsWith(root)) throw new Error("Unsafe proof cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);

test("poster accepts portrait display orientation stored in JPEG EXIF", async () => {
  const dir = await mkdtemp(root);
  try {
    const source = join(dir, "cover.jpg");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=1920x1080",
        "-frames:v",
        "1",
        source,
      ],
      { timeoutSeconds: 30 },
    );
    const jpeg = new Uint8Array(await Bun.file(source).arrayBuffer());
    const exif = new Uint8Array([
      0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1,
      0, 18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const combined = new Uint8Array(jpeg.length + exif.length);
    combined.set(jpeg.subarray(0, 2));
    combined.set(exif, 2);
    combined.set(jpeg.subarray(2), 2 + exif.length);
    await Bun.write(source, combined);
    expect(
      await transcodePoster(
        source,
        join(dir, "cover.webp"),
        "cover.jpg",
        combined.length,
      ),
    ).toEqual({ width: 1080, height: 1920, codec: "webp" });
  } finally {
    if (!dir.startsWith(root)) throw new Error("Unsafe proof cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
