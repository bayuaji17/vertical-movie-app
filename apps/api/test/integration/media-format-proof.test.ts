import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { runMediaProcess, MediaProcessError } from "../../src/workers/process";
import { probe, videoFacts, verifyEbml } from "../../src/workers/probe";
import { transcodeHls, transcodePoster } from "../../src/workers/transcode";
const root = "/var/tmp/vertical-movie-format-proof-";
test("approved actual source containers/codecs decode through HLS, HDR maps to SDR and display rotation is honored", async () => {
  const dir = await mkdtemp(root);
  try {
    const formats = [
      ["mp4", "libx264"],
      ["mov", "libx264"],
      ["mkv", "libx264"],
      ["mp4", "libx265"],
      ["mov", "libx265"],
      ["mkv", "libx265"],
      ["webm", "libvpx"],
      ["webm", "libvpx-vp9"],
    ] as const;
    for (let i = 0; i < formats.length; i++) {
      const [ext, codec] = formats[i],
        source = join(dir, "source-" + i + "." + ext),
        args = [
          "ffmpeg",
          "-v",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=486x864:rate=12",
          "-t",
          "1",
          "-c:v",
          codec,
          "-threads",
          "1",
        ];
      if (codec === "libx264") args.push("-preset", "ultrafast");
      if (codec === "libx265")
        args.push(
          "-preset",
          "ultrafast",
          "-x265-params",
          "pools=1:frame-threads=1:log-level=error",
          "-vf",
          "format=yuv420p10le,setparams=color_primaries=bt2020:color_trc=smpte2084:colorspace=bt2020nc",
          "-pix_fmt",
          "yuv420p10le",
          "-color_primaries",
          "bt2020",
          "-color_trc",
          "smpte2084",
          "-colorspace",
          "bt2020nc",
        );
      if (codec.startsWith("libvpx"))
        args.push("-deadline", "realtime", "-cpu-used", "8", "-b:v", "1M");
      args.push(source);
      await runMediaProcess(args, { timeoutSeconds: 60 });
      await verifyEbml(source, "source." + ext);
      const facts = videoFacts(
        await probe(source),
        "movie",
        "source." + ext,
        Bun.file(source).size,
      );
      if (codec === "libx265") expect(facts.hdr).toBe(true);
      const output = join(dir, "hls-" + i);
      await transcodeHls(source, output, facts, { timeoutSeconds: 60 });
      const decoded = await probe(join(output, "0/index.m3u8"));
      expect(decoded.streams[0].codec_name).toBe("h264");
      expect(decoded.streams[0].pix_fmt).toBe("yuv420p");
      expect(decoded.streams[0].color_transfer).toBe("bt709");
    }
    const landscape = join(dir, "landscape.mp4"),
      rotated = join(dir, "rotated.mov");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=864x486:rate=24",
        "-t",
        "1",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-threads",
        "1",
        landscape,
      ],
      { timeoutSeconds: 30 },
    );
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-display_rotation:v:0",
        "90",
        "-i",
        landscape,
        "-c",
        "copy",
        rotated,
      ],
      { timeoutSeconds: 30 },
    );
    const facts = videoFacts(
      await probe(rotated),
      "movie",
      "source.mov",
      Bun.file(rotated).size,
    );
    expect(facts.displayWidth).toBe(486);
    expect(facts.displayHeight).toBe(864);
    await transcodeHls(rotated, join(dir, "rotated-hls"), facts, {
      timeoutSeconds: 30,
    });
    expect(
      (await probe(join(dir, "rotated-hls/0/index.m3u8"))).streams[0].height,
    ).toBe(864);
  } finally {
    if (!dir.startsWith(root)) throw new Error("Unsafe fixture cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 180000);
test("forged containers, undecodable source and animated/incorrect-ratio posters never become ready", async () => {
  const dir = await mkdtemp(root);
  try {
    const bad = join(dir, "bad.mp4");
    await Bun.write(bad, "invalid-source");
    await expect(probe(bad)).rejects.toBeInstanceOf(MediaProcessError);
    const square = join(dir, "square.png");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=1920x1920",
        "-frames:v",
        "1",
        square,
      ],
      { timeoutSeconds: 30 },
    );
    await expect(
      transcodePoster(
        square,
        join(dir, "out.webp"),
        "square.png",
        Bun.file(square).size,
      ),
    ).rejects.toMatchObject({ code: "MEDIA_INVALID_POSTER_DIMENSIONS" });
    await expect(
      transcodePoster(square, join(dir, "out.webp"), "square.png", 5000001),
    ).rejects.toMatchObject({ code: "MEDIA_INVALID_POSTER" });
    const animated = join(dir, "animated.webp");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1080x1920:rate=2",
        "-t",
        "1",
        "-c:v",
        "libwebp_anim",
        "-threads",
        "1",
        animated,
      ],
      { timeoutSeconds: 30 },
    );
    await expect(
      transcodePoster(
        animated,
        join(dir, "out.webp"),
        "animated.webp",
        Bun.file(animated).size,
      ),
    ).rejects.toBeInstanceOf(MediaProcessError);
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
        "testsrc2=size=486x864:rate=24",
        "-t",
        "2",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-threads",
        "1",
        "-movflags",
        "+faststart",
        source,
      ],
      { timeoutSeconds: 30 },
    );
    const parsed = await probe(source);
    expect(() =>
      videoFacts(parsed, "movie", "source.webm", Bun.file(source).size),
    ).toThrow();
    const original = new Uint8Array(await Bun.file(source).arrayBuffer());
    await Bun.write(
      source,
      original.subarray(0, Math.floor(original.length / 2)),
    );
    const facts = videoFacts(
      await probe(source),
      "movie",
      "source.mp4",
      Bun.file(source).size,
    );
    await expect(
      transcodeHls(source, join(dir, "broken-hls"), facts, {
        timeoutSeconds: 30,
      }),
    ).rejects.toBeInstanceOf(MediaProcessError);
  } finally {
    if (!dir.startsWith(root)) throw new Error("Unsafe fixture cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 90000);

test("VFR and anamorphic display geometry normalize to stable portrait HLS", async () => {
  const dir = await mkdtemp(root);
  try {
    const vfr = join(dir, "vfr.mp4");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=486x864:rate=24",
        "-t",
        "2",
        "-vf",
        "setpts=if(lt(N\\,24)\\,N/(24*TB)\\,1+(N-24)/(12*TB))",
        "-fps_mode",
        "vfr",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-threads",
        "1",
        vfr,
      ],
      { timeoutSeconds: 30 },
    );
    const facts = videoFacts(
      await probe(vfr),
      "episode",
      "source.mp4",
      Bun.file(vfr).size,
    );
    expect(facts.fps).toBeLessThanOrEqual(30);
    await transcodeHls(vfr, join(dir, "vfr-hls"), facts, {
      timeoutSeconds: 30,
    });
    expect(
      (await probe(join(dir, "vfr-hls/0/index.m3u8"))).streams[0].codec_name,
    ).toBe("h264");
    const source = join(dir, "sar.mp4");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=432x864:rate=24",
        "-t",
        "1",
        "-vf",
        "setsar=9/8",
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
    const sar = videoFacts(
      await probe(source),
      "movie",
      "source.mp4",
      Bun.file(source).size,
    );
    expect(sar.displayWidth).toBe(486);
    await transcodeHls(source, join(dir, "sar-hls"), sar, {
      timeoutSeconds: 30,
    });
    const output = await probe(join(dir, "sar-hls/0/index.m3u8"));
    expect(output.streams[0].width).toBe(486);
    expect(output.streams[0].sample_aspect_ratio).toBe("1:1");
  } finally {
    if (!dir.startsWith(root)) throw new Error("Unsafe fixture cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
