import { runMediaProcess, MediaProcessError } from "./process";
export type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  sample_aspect_ratio?: string;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  duration?: string;
  nb_read_frames?: string;
  pix_fmt?: string;
  color_transfer?: string;
  side_data_list?: { rotation?: number }[];
  tags?: Record<string, string>;
};
export type ProbeResult = {
  streams: ProbeStream[];
  format: {
    format_name?: string;
    duration?: string;
    size?: string;
    tags?: Record<string, string>;
  };
};
export type VideoFacts = {
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  rotation: number;
  sar: number;
  durationMs: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
  hdr: boolean;
  container: string;
};
export async function probe(
  path: string,
  executable = "ffprobe",
  signal?: AbortSignal,
): Promise<ProbeResult> {
  const output = await runMediaProcess(
    [
      executable,
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      path,
    ],
    { timeoutSeconds: 60, signal },
  );
  try {
    const value = JSON.parse(output);
    if (!Array.isArray(value.streams) || !value.format) throw new Error();
    return value;
  } catch {
    throw new MediaProcessError("MEDIA_INVALID_PROBE");
  }
}
function ratio(value: string | undefined, fallback = 1) {
  if (!value || value === "N/A" || value === "0:1" || value === "0/0")
    return fallback;
  const [a, b] = value.split(/[:/]/).map(Number);
  return a > 0 && b > 0 ? a / b : fallback;
}
export function videoFacts(
  p: ProbeResult,
  kind: "episode" | "movie" | "standalone",
  filename: string,
  size: number,
): VideoFacts {
  const reject = () => {
    throw new MediaProcessError("MEDIA_INVALID_SOURCE");
  };
  const video = p.streams.filter((s) => s.codec_type === "video");
  if (video.length !== 1) reject();
  const v = video[0],
    width = v.width ?? 0,
    height = v.height ?? 0,
    sar = ratio(v.sample_aspect_ratio);
  const angle =
    v.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ??
    Number(v.tags?.rotate ?? 0);
  const rotation = ((Math.round(angle) % 360) + 360) % 360;
  if (![0, 90, 180, 270].includes(rotation)) reject();
  const displayWidth = rotation % 180 ? height : width * sar,
    displayHeight = rotation % 180 ? width * sar : height;
  const duration = Number(p.format.duration ?? v.duration),
    fps = ratio(v.avg_frame_rate, ratio(v.r_frame_rate, 30));
  const ext = filename.split(".").pop()?.toLowerCase(),
    container = p.format.format_name ?? "",
    codec = v.codec_name ?? "";
  const codecOk =
    ext === "webm"
      ? ["vp8", "vp9"].includes(codec)
      : ["h264", "hevc"].includes(codec);
  const containerOk =
    ext === "mp4" || ext === "mov"
      ? container.split(",").includes("mov")
      : ext === "mkv" || ext === "webm"
        ? container.split(",").includes("matroska")
        : false;
  if (
    !codecOk ||
    !containerOk ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > (kind === "episode" ? 600 : 1800) ||
    size <= 0 ||
    size > (kind === "episode" ? 512000000 : 1500000000) ||
    width < 1 ||
    height < 1 ||
    displayWidth < 480 - 1e-6 ||
    displayWidth > 1080 + 1e-6 ||
    displayHeight > 1920 + 1e-6 ||
    displayHeight <= displayWidth ||
    Math.abs(displayWidth - (displayHeight * 9) / 16) > 1 ||
    !Number.isFinite(fps) ||
    fps <= 0 ||
    fps > 240
  )
    reject();
  return {
    width,
    height,
    displayWidth,
    displayHeight,
    rotation,
    sar,
    durationMs: Math.ceil(duration * 1000),
    fps: Math.min(30, fps),
    codec,
    hasAudio: p.streams.some((s) => s.codec_type === "audio"),
    hdr: ["smpte2084", "arib-std-b67"].includes(v.color_transfer ?? ""),
    container,
  };
}
export function ladder(f: VideoFacts) {
  const tiers = [
    { name: "480", width: 486, height: 864, bitrate: 1200000 },
    { name: "720", width: 720, height: 1280, bitrate: 2500000 },
    { name: "1080", width: 1080, height: 1920, bitrate: 4500000 },
  ];
  const available = tiers.filter(
    (t) =>
      t.width <= f.displayWidth + 1e-6 && t.height <= f.displayHeight + 1e-6,
  );
  if (!available.length) {
    const height = Math.floor(f.displayHeight / 2) * 2,
      width = Math.floor((height * 9) / 16 / 2) * 2;
    available.push({ name: "480", width, height, bitrate: 1200000 });
  }
  return available;
}
export async function verifyEbml(path: string, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext !== "mkv" && ext !== "webm") return;
  const bytes = new Uint8Array(
    await Bun.file(path).slice(0, 4096).arrayBuffer(),
  );
  let type = "";
  for (let i = 0; i < bytes.length - 3; i++)
    if (bytes[i] === 0x42 && bytes[i + 1] === 0x82) {
      const first = bytes[i + 2];
      let length = 1,
        mask = 128;
      while (length <= 8 && !(first & mask)) {
        length++;
        mask >>= 1;
      }
      if (length > 4) break;
      let n = first & (mask - 1);
      for (let j = 1; j < length; j++) n = n * 256 + bytes[i + 2 + j];
      if (n > 16 || i + 2 + length + n > bytes.length) break;
      type = new TextDecoder().decode(
        bytes.slice(i + 2 + length, i + 2 + length + n),
      );
      break;
    }
  if (type !== (ext === "webm" ? "webm" : "matroska"))
    throw new MediaProcessError("MEDIA_INVALID_CONTAINER");
}
