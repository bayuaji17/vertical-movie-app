import { test, expect } from "bun:test";
import { videoFacts, ladder, type ProbeResult } from "./probe";
const fixture = (width = 1080, height = 1920): ProbeResult => ({
  streams: [
    {
      codec_type: "video",
      codec_name: "h264",
      width,
      height,
      avg_frame_rate: "60/1",
      sample_aspect_ratio: "1:1",
    },
  ],
  format: { format_name: "mov,mp4", duration: "600" },
});
test("portrait source limits use display rotation/SAR and exact duration/size boundaries", () => {
  const f = videoFacts(fixture(), "episode", "source.mp4", 512000000);
  expect(f.fps).toBe(30);
  expect(ladder(f)).toHaveLength(3);
  for (const p of [
    fixture(2160, 3840),
    fixture(1920, 1080),
    fixture(1080, 1080),
  ])
    expect(() => videoFacts(p, "episode", "source.mp4", 100)).toThrow();
  const rotated = fixture(1920, 1080);
  rotated.streams[0].side_data_list = [{ rotation: 90 }];
  expect(videoFacts(rotated, "movie", "a.mov", 100).displayWidth).toBe(1080);
  const duration = fixture();
  duration.format.duration = "600.001";
  expect(() => videoFacts(duration, "episode", "a.mp4", 100)).toThrow();
  expect(() => videoFacts(fixture(), "episode", "a.mp4", 512000001)).toThrow();
});
test("480 to 485 display widths retain a native even-size rendition", () => {
  const f = videoFacts(fixture(480, 854), "movie", "a.mp4", 100);
  const t = ladder(f);
  expect(t).toHaveLength(1);
  expect(t[0].width).toBe(480);
  expect(t[0].height).toBeLessThanOrEqual(f.displayHeight);
});
test("actual codec/container pairing rejects forged extensions", () => {
  const p = fixture();
  p.streams[0].codec_name = "vp9";
  expect(() => videoFacts(p, "movie", "a.mp4", 100)).toThrow();
  p.format.format_name = "matroska,webm";
  expect(videoFacts(p, "movie", "a.webm", 100).codec).toBe("vp9");
  expect(() => videoFacts(p, "movie", "a.mkv", 100)).toThrow();
});
