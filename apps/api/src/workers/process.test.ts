import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "bun:test";
import { runMediaProcess } from "./process";
test("missing binary pauses worker through a stable redacted config code", async () => {
  await expect(
    runMediaProcess(["vertical-movie-proof-missing-binary"], {
      timeoutSeconds: 3,
    }),
  ).rejects.toMatchObject({ code: "MEDIA_CONFIG_BINARY" });
});
test("process deadline and explicit cancellation stop subprocesses", async () => {
  await expect(
    runMediaProcess([process.execPath, "-e", "setTimeout(()=>{},10000)"], {
      timeoutSeconds: 1,
    }),
  ).rejects.toMatchObject({ code: "MEDIA_TIMEOUT" });
  const controller = new AbortController();
  const run = runMediaProcess(
    [process.execPath, "-e", "setTimeout(()=>{},10000)"],
    { timeoutSeconds: 5, signal: controller.signal },
  );
  setTimeout(() => controller.abort(), 100);
  await expect(run).rejects.toMatchObject({ code: "MEDIA_CANCELLED" });
}, 10000);

test.skipIf(process.platform !== "linux")(
  "cancellation kills the owned process group when its child ignores TERM",
  async () => {
    const dir = await mkdtemp("/var/tmp/vertical-movie-process-proof-"),
      path = join(dir, "pid"),
      controller = new AbortController();
    let pid: number | undefined;
    const running = runMediaProcess(
      [
        process.execPath,
        "-e",
        `process.on("SIGTERM",()=>{});Bun.write(${JSON.stringify(path)},String(process.pid));setInterval(()=>{},1000)`,
      ],
      { timeoutSeconds: 20, signal: controller.signal },
    );
    try {
      for (let i = 0; i < 100; i++) {
        try {
          pid = Number(await readFile(path, "utf8"));
          if (pid > 1) break;
        } catch {}
        await Bun.sleep(20);
      }
      if (!pid || pid <= 1) throw new Error("Proof process did not start");
      controller.abort();
      await expect(running).rejects.toMatchObject({ code: "MEDIA_CANCELLED" });
      let alive = true;
      for (let i = 0; i < 50; i++) {
        try {
          process.kill(pid, 0);
        } catch {
          alive = false;
          break;
        }
        await Bun.sleep(20);
      }
      expect(alive).toBe(false);
    } finally {
      controller.abort();
      if (pid && pid > 1) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
      await running.catch(() => {});
      await rm(dir, { recursive: true, force: true });
    }
  },
  25000,
);
