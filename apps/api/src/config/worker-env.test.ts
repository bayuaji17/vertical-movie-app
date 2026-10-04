import { test, expect } from "bun:test";
import { loadWorkerEnv } from "./worker-env";
test("worker policy defaults to one job and approved deadlines/retries", () => {
  const v = loadWorkerEnv({});
  expect(v.concurrency).toBe(1);
  expect(v.retryDelays).toEqual([60, 300]);
  expect(v.heartbeatSeconds).toBe(15);
  expect(v.leaseSeconds).toBe(120);
  expect(v.minTimeoutSeconds).toBe(900);
  expect(v.timeoutFactor).toBe(3);
});
test("worker env rejects unbounded parallelism, broken leases and unsafe temp directories", () => {
  for (const env of [
    { MEDIA_WORKER_CONCURRENCY: "0" },
    { MEDIA_WORKER_CONCURRENCY: "9" },
    { MEDIA_JOB_LEASE_SECONDS: "20" },
    { MEDIA_JOB_MAX_ATTEMPTS: "4" },
    { MEDIA_WORKER_WORKDIR: "/" },
    { MEDIA_WORKER_MIN_FREE_BYTES: "0" },
    { FFMPEG_PATH: "" },
  ])
    expect(() => loadWorkerEnv(env)).toThrow();
  expect(loadWorkerEnv({ MEDIA_WORKER_CONCURRENCY: "2" }).concurrency).toBe(2);
});
