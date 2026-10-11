import type { Logger } from "@repo/log";

/**
 * Throttled transcode progress: a line every `stepPercent` of the media
 * duration or every `intervalMs`, whichever comes first, never repeating a
 * percentage and never going backwards. FFmpeg reports far more often.
 */
export function createProgressLog({
  log,
  totalSeconds,
  now = () => Date.now(),
  stepPercent = 10,
  intervalMs = 15_000,
}: {
  log: Logger;
  totalSeconds: number;
  now?: () => number;
  stepPercent?: number;
  intervalMs?: number;
}) {
  const startedAt = now();
  let lastPercent = 0,
    lastAt = startedAt;
  const percentOf = (seconds: number) =>
    totalSeconds > 0
      ? Math.max(0, Math.min(100, Math.floor((seconds / totalSeconds) * 100)))
      : 0;
  return {
    report(seconds: number) {
      const percent = percentOf(seconds),
        at = now();
      if (percent <= lastPercent) return;
      if (percent < lastPercent + stepPercent && at - lastAt < intervalMs)
        return;
      lastPercent = percent;
      lastAt = at;
      log.info("job.stage", {
        stage: "transcode",
        phase: "progress",
        percent,
        mediaSeconds: Math.round(seconds * 10) / 10,
        elapsedMs: at - startedAt,
      });
    },
    get percent() {
      return lastPercent;
    },
  };
}
