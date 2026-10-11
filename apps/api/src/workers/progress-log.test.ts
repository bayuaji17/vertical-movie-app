import { expect, test } from "bun:test";
import { createLogger } from "@repo/log";

import { createProgressLog } from "./progress-log";

function setup(totalSeconds = 100) {
  const records: Array<Record<string, unknown>> = [];
  const log = createLogger("worker", {
    config: { level: "debug", format: "json", bodies: false },
    write: (line) => void records.push(JSON.parse(line)),
  });
  let clock = 0;
  const progress = createProgressLog({
    log,
    totalSeconds,
    now: () => clock,
  });
  return {
    records,
    progress,
    at: (ms: number) => {
      clock = ms;
    },
  };
}

test("logs every ten percent and ignores the many smaller FFmpeg updates", () => {
  const { records, progress, at } = setup();
  for (let s = 0; s <= 100; s += 0.5) {
    at(s * 100);
    progress.report(s);
  }
  expect(records.map((r) => r.percent)).toEqual([
    10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  ]);
  expect(records[0]).toMatchObject({
    event: "job.stage",
    stage: "transcode",
    phase: "progress",
    mediaSeconds: 10,
  });
  expect(progress.percent).toBe(100);
});
test("a slow job still reports once the interval passes, never repeats and never goes backwards", () => {
  const { records, progress, at } = setup(100);
  at(1000);
  progress.report(3);
  expect(records).toHaveLength(0);
  at(16_000);
  progress.report(4);
  expect(records.map((r) => r.percent)).toEqual([4]);
  expect(records[0]!.elapsedMs).toBe(16_000);
  at(40_000);
  progress.report(4.4);
  progress.report(2);
  expect(records).toHaveLength(1);
});
test("an unknown duration or out-of-range progress never logs nonsense", () => {
  const unknown = setup(0);
  unknown.at(60_000);
  unknown.progress.report(50);
  expect(unknown.records).toHaveLength(0);
  const over = setup(10);
  over.at(60_000);
  over.progress.report(500);
  expect(over.records.map((r) => r.percent)).toEqual([100]);
});
