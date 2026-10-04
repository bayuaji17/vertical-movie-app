import { jpegOrientation } from "./image-orientation";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  runMediaProcess,
  MediaProcessError,
  type ProcessOptions,
} from "./process";
import { ladder, probe, type VideoFacts } from "./probe";
export async function transcodeHls(
  source: string,
  directory: string,
  facts: VideoFacts,
  options: Partial<ProcessOptions> & {
    ffmpeg?: string;
    ffprobe?: string;
    threads?: number;
  } = {},
) {
  const tiers = ladder(facts);
  await mkdir(directory, { recursive: true });
  for (let i = 0; i < tiers.length; i++)
    await mkdir(join(directory, String(i)), { recursive: true });
  const fps = Math.min(30, facts.fps),
    gop = Math.max(1, Math.round(fps * 2));
  const args = [
    options.ffmpeg ?? "ffmpeg",
    "-hide_banner",
    "-loglevel",
    "error",
    "-xerror",
    "-nostdin",
    "-y",
    "-threads",
    String(options.threads ?? 1),
    "-i",
    source,
    "-filter_threads",
    String(options.threads ?? 1),
    "-filter_complex_threads",
    String(options.threads ?? 1),
  ];
  const colors = facts.hdr
    ? "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,"
    : "";
  const split =
    tiers.length > 1
      ? "split=" + tiers.length + tiers.map((_, i) => "[in" + i + "]").join("")
      : "null[in0]";
  const filters = [
    "[0:v:0]" + colors + split,
    ...tiers.map(
      (t, i) =>
        "[in" +
        i +
        "]scale=" +
        t.width +
        ":" +
        t.height +
        ":flags=lanczos,setsar=" +
        t.height * 9 +
        "/" +
        t.width * 16 +
        ",fps=" +
        fps +
        ",format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709[v" +
        i +
        "]",
    ),
  ];
  args.push("-filter_complex", filters.join(";"));
  for (let i = 0; i < tiers.length; i++) {
    args.push("-map", "[v" + i + "]");
    if (facts.hasAudio) args.push("-map", "0:a:0");
  }
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-threads:v",
    String(options.threads ?? 1),
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    "-flags",
    "+cgop",
    "-force_key_frames",
    "expr:gte(t,n_forced*2)",
    "-color_primaries:v",
    "bt709",
    "-color_trc:v",
    "bt709",
    "-colorspace:v",
    "bt709",
  );
  for (let i = 0; i < tiers.length; i++)
    args.push(
      "-b:v:" + i,
      String(tiers[i].bitrate),
      "-maxrate:v:" + i,
      String(Math.round(tiers[i].bitrate * 1.5)),
      "-bufsize:v:" + i,
      String(tiers[i].bitrate * 2),
    );
  if (facts.hasAudio)
    args.push("-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000");
  args.push(
    "-f",
    "hls",
    "-hls_time",
    "6",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_type",
    "fmp4",
    "-hls_flags",
    "independent_segments",
    "-hls_fmp4_init_filename",
    tiers.length > 1 ? "init_%v.mp4" : "init_0.mp4",
    "-hls_segment_filename",
    join(directory, "%v", "segment_%06d.m4s"),
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    tiers.map((_, i) => "v:" + i + (facts.hasAudio ? ",a:" + i : "")).join(" "),
    "-progress",
    "pipe:1",
    join(directory, "%v", "index.m3u8"),
  );
  await runMediaProcess(args, {
    timeoutSeconds:
      options.timeoutSeconds ??
      Math.max(900, Math.ceil((facts.durationMs / 1000) * 3)),
    stallSeconds: options.stallSeconds ?? 300,
    signal: options.signal,
    onProgress: options.onProgress,
  });
  const files: string[] = ["master.m3u8"];
  for (let i = 0; i < tiers.length; i++) {
    const names = await readdir(join(directory, String(i)));
    for (const name of names) files.push(i + "/" + name);
  }
  await recordBandwidth(directory, tiers.length);
  await verifyHls(
    directory,
    files,
    facts,
    options.ffprobe ?? "ffprobe",
    options.signal,
  );
  return { tiers, files };
}
async function recordBandwidth(directory: string, count: number) {
  const bandwidths: { peak: number; average: number }[] = [];
  for (let i = 0; i < count; i++) {
    const text = await Bun.file(
      join(directory, String(i), "index.m3u8"),
    ).text();
    let bytes = 0,
      duration = 0,
      peak = 0;
    for (const match of text.matchAll(
      /#EXTINF:([0-9.]+),[^\n]*\n(segment_\d+\.m4s)/g,
    )) {
      const seconds = Number(match[1]);
      if (!Number.isFinite(seconds) || seconds <= 0)
        throw new MediaProcessError("MEDIA_INVALID_HLS");
      const size = Bun.file(join(directory, String(i), match[2])).size;
      if (size <= 0) throw new MediaProcessError("MEDIA_EMPTY_HLS_OBJECT");
      bytes += size;
      duration += seconds;
      peak = Math.max(peak, Math.ceil((size * 8) / seconds));
    }
    if (!duration) throw new MediaProcessError("MEDIA_EMPTY_HLS");
    bandwidths.push({ peak, average: Math.ceil((bytes * 8) / duration) });
  }
  const master = await Bun.file(join(directory, "master.m3u8")).text(),
    lines = master.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++)
    if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
      const index = Number(lines[i + 1]?.match(/^(\d+)\/index\.m3u8$/)?.[1]),
        value = bandwidths[index];
      if (!value) throw new MediaProcessError("MEDIA_INVALID_HLS_REFERENCE");
      // Max single-segment bitrate also bounds every duration-weighted segment window.
      lines[i] =
        lines[i]
          .replace(
            /(^|[:,])BANDWIDTH=\d+/,
            (_, prefix) => prefix + "BANDWIDTH=" + value.peak,
          )
          .replace(/,AVERAGE-BANDWIDTH=\d+/, "") +
        ",AVERAGE-BANDWIDTH=" +
        value.average;
    }
  await Bun.write(join(directory, "master.m3u8"), lines.join("\n"));
}
export async function verifyHls(
  directory: string,
  files: string[],
  facts: VideoFacts,
  ffprobe = "ffprobe",
  signal?: AbortSignal,
) {
  const known = new Set(files);
  let variants = 0;
  for (const file of files.filter((f) => f.endsWith(".m3u8"))) {
    const text = await Bun.file(join(directory, file)).text();
    if (!text.startsWith("#EXTM3U"))
      throw new MediaProcessError("MEDIA_INVALID_HLS");
    const base = file.includes("/")
      ? file.slice(0, file.lastIndexOf("/") + 1)
      : "";
    const refs = [
      ...text.split(/\r?\n/).filter((l) => l && !l.startsWith("#")),
      ...[...text.matchAll(/URI="([^"]+)"/g)].map((m) => m[1]),
    ];
    for (const ref of refs) {
      if (
        !/^[a-zA-Z0-9_/.-]+$/.test(ref) ||
        ref.startsWith("/") ||
        ref.split("/").includes("..") ||
        !known.has(base + ref)
      )
        throw new MediaProcessError("MEDIA_INVALID_HLS_REFERENCE");
      if ((await Bun.file(join(directory, base + ref)).stat()).size === 0)
        throw new MediaProcessError("MEDIA_EMPTY_HLS_OBJECT");
    }
    if (file !== "master.m3u8") {
      variants++;
      if (
        !text.includes("#EXT-X-ENDLIST") ||
        !/#EXT-X-MAP:URI="init_\d+\.mp4"/.test(text)
      )
        throw new MediaProcessError("MEDIA_INCOMPLETE_HLS");
      const duration = [...text.matchAll(/#EXTINF:([0-9.]+)/g)].reduce(
        (n, m) => n + Number(m[1]),
        0,
      );
      if (Math.abs(duration - facts.durationMs / 1000) > 1)
        throw new MediaProcessError("MEDIA_HLS_DURATION_MISMATCH");
      const result = await probe(join(directory, file), ffprobe, signal);
      const stream = result.streams.find((s) => s.codec_type === "video");
      if (
        !stream ||
        stream.codec_name !== "h264" ||
        stream.pix_fmt !== "yuv420p"
      )
        throw new MediaProcessError("MEDIA_HLS_CODEC_MISMATCH");
    }
  }
  if (!variants) throw new MediaProcessError("MEDIA_EMPTY_HLS");
}
export async function transcodePoster(
  source: string,
  output: string,
  filename: string,
  size: number,
  ffmpeg = "ffmpeg",
  ffprobe = "ffprobe",
  signal?: AbortSignal,
) {
  if (size <= 0 || size > 5000000)
    throw new MediaProcessError("MEDIA_INVALID_POSTER");
  const p = await probe(source, ffprobe, signal),
    v = p.streams.filter((s) => s.codec_type === "video");
  const ext = filename.split(".").pop()?.toLowerCase();
  if (
    v.length !== 1 ||
    !(
      { jpg: "mjpeg", jpeg: "mjpeg", png: "png", webp: "webp" } as Record<
        string,
        string
      >
    )[ext ?? ""] ||
    v[0].codec_name !==
      (
        { jpg: "mjpeg", jpeg: "mjpeg", png: "png", webp: "webp" } as Record<
          string,
          string
        >
      )[ext!] ||
    p.streams.some((s) => s.codec_type === "audio")
  )
    throw new MediaProcessError("MEDIA_INVALID_POSTER");
  // Count decoded frames so animated formats cannot masquerade as a still cover.
  const counted = JSON.parse(
    await runMediaProcess(
      [
        ffprobe,
        "-v",
        "error",
        "-count_frames",
        "-show_streams",
        "-of",
        "json",
        source,
      ],
      { timeoutSeconds: 60, signal },
    ),
  );
  if (counted.streams?.[0]?.nb_read_frames !== "1")
    throw new MediaProcessError("MEDIA_ANIMATED_POSTER");
  const orientation = ["jpg", "jpeg"].includes(ext ?? "")
    ? jpegOrientation(new Uint8Array(await Bun.file(source).arrayBuffer()))
    : 1;
  const swapped = orientation >= 5;
  const width = (swapped ? v[0].height : v[0].width) ?? 0,
    height = (swapped ? v[0].width : v[0].height) ?? 0;
  if (width < 1080 || height < 1920 || width * 16 !== height * 9)
    throw new MediaProcessError("MEDIA_INVALID_POSTER_DIMENSIONS");
  await runMediaProcess(
    [
      ffmpeg,
      "-hide_banner",
      "-loglevel",
      "error",
      "-xerror",
      "-nostdin",
      "-y",
      "-i",
      source,
      "-frames:v",
      "1",
      "-vf",
      "scale=1080:1920:flags=lanczos,setsar=1",
      "-c:v",
      "libwebp",
      "-quality",
      "85",
      output,
    ],
    { timeoutSeconds: 60, signal },
  );
  const verified = await probe(output, ffprobe, signal);
  if (
    verified.streams[0]?.width !== 1080 ||
    verified.streams[0]?.height !== 1920 ||
    verified.streams[0]?.codec_name !== "webp"
  )
    throw new MediaProcessError("MEDIA_INVALID_POSTER_OUTPUT");
  return { width: 1080, height: 1920, codec: "webp" };
}
