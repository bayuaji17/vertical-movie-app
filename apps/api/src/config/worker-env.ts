import { isAbsolute, resolve } from "node:path";
export type WorkerEnv = {
  concurrency: number;
  maxAttempts: number;
  retryDelays: number[];
  heartbeatSeconds: number;
  leaseSeconds: number;
  recoverySeconds: number;
  pollSeconds: number;
  stallSeconds: number;
  timeoutFactor: number;
  minTimeoutSeconds: number;
  hardTimeoutSeconds: number;
  shutdownSeconds: number;
  threads: number;
  minFreeBytes: number;
  workdir: string;
  ffmpeg: string;
  ffprobe: string;
};
export function loadWorkerEnv(
  source: Record<string, string | undefined> = Bun.env,
): WorkerEnv {
  const integer = (key: string, fallback: number, max = 86400) => {
    const raw = source[key];
    if (raw === undefined) return fallback;
    if (
      !/^[1-9][0-9]*$/.test(raw) ||
      !Number.isSafeInteger(Number(raw)) ||
      Number(raw) > max
    )
      throw new Error(key + " must be a positive integer.");
    return Number(raw);
  };
  const maxAttempts = integer("MEDIA_JOB_MAX_ATTEMPTS", 3, 10);
  const delays = (source.MEDIA_JOB_RETRY_DELAYS_SECONDS ?? "60,300")
    .split(",")
    .map((v) => {
      if (!/^[1-9][0-9]*$/.test(v) || Number(v) > 86400)
        throw new Error("MEDIA_JOB_RETRY_DELAYS_SECONDS is invalid.");
      return Number(v);
    });
  if (delays.length < maxAttempts - 1)
    throw new Error("MEDIA_JOB_RETRY_DELAYS_SECONDS needs a delay per retry.");
  const heartbeatSeconds = integer("MEDIA_JOB_HEARTBEAT_SECONDS", 15),
    leaseSeconds = integer("MEDIA_JOB_LEASE_SECONDS", 120);
  if (heartbeatSeconds * 2 >= leaseSeconds)
    throw new Error(
      "MEDIA_JOB_LEASE_SECONDS must exceed two heartbeat intervals.",
    );
  const workdir =
    source.MEDIA_WORKER_WORKDIR ?? "/var/tmp/vertical-movie-worker";
  if (
    !isAbsolute(workdir) ||
    resolve(workdir) === "/" ||
    workdir.includes("..") ||
    /[\x00-\x1f]/.test(workdir)
  )
    throw new Error(
      "MEDIA_WORKER_WORKDIR must be a dedicated absolute directory.",
    );
  const executable = (key: string, fallback: string) => {
    const value = source[key] ?? fallback;
    if (!value.trim() || /[\x00-\x1f]/.test(value))
      throw new Error(key + " is invalid.");
    return value;
  };
  return {
    concurrency: integer("MEDIA_WORKER_CONCURRENCY", 1, 8),
    maxAttempts,
    retryDelays: delays.slice(0, maxAttempts - 1),
    heartbeatSeconds,
    leaseSeconds,
    recoverySeconds: integer("MEDIA_JOB_RECOVERY_POLL_SECONDS", 30),
    pollSeconds: integer("MEDIA_JOB_POLL_SECONDS", 5),
    stallSeconds: integer("MEDIA_JOB_STALL_TIMEOUT_SECONDS", 300),
    timeoutFactor: integer("MEDIA_TRANSCODE_TIMEOUT_FACTOR", 3, 20),
    minTimeoutSeconds: integer("MEDIA_TRANSCODE_MIN_TIMEOUT_SECONDS", 900),
    hardTimeoutSeconds: integer("MEDIA_JOB_HARD_TIMEOUT_SECONDS", 7200),
    shutdownSeconds: integer("MEDIA_WORKER_SHUTDOWN_SECONDS", 60),
    threads: integer("MEDIA_FFMPEG_THREADS", 1, 8),
    minFreeBytes: integer(
      "MEDIA_WORKER_MIN_FREE_BYTES",
      10737418240,
      Number.MAX_SAFE_INTEGER,
    ),
    workdir,
    ffmpeg: executable("FFMPEG_PATH", "ffmpeg"),
    ffprobe: executable("FFPROBE_PATH", "ffprobe"),
  };
}
