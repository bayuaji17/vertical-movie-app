import { resolve } from "node:path";
import { expect } from "bun:test";
import type { createApp } from "../../src/app";
export async function proveBrowserPlayback(
  app: ReturnType<typeof createApp>,
  slug: string,
) {
  const port = Number(Bun.env.MEDIA_PLAYBACK_BROWSER_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Browser proof port is invalid");
  const reservation = Bun.serve({
    hostname: "0.0.0.0",
    port,
    fetch: () => new Response("proof reservation"),
  });
  reservation.stop(true);
  const server = Bun.serve({
    hostname: "0.0.0.0",
    port: 0,
    fetch: (r) => app.handle(r),
  });
  const cwd = resolve(import.meta.dir, "../../../web"),
    origin = "http://localhost:" + port;
  const web = Bun.spawn(
    [
      process.execPath,
      "run",
      Bun.env.MEDIA_PLAYBACK_BROWSER_RUNTIME === "built" ? "start" : "dev",
    ],
    {
      cwd,
      env: {
        ...Bun.env,
        PORT: String(port),
        HOST: "0.0.0.0",
        API_INTERNAL_URL: "http://localhost:" + server.port,
        VITE_API_URL: origin,
      },
      stdout: "ignore",
      stderr: "ignore",
    },
  );
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      try {
        ready = (await fetch(origin)).ok;
      } catch {}
      if (ready) break;
      await Bun.sleep(500);
    }
    if (!ready) throw new Error("Web proof server did not start");
    const node = Bun.env.MEDIA_BROWSER_NODE,
      worker = Bun.env.MEDIA_PLAYBACK_BROWSER_WORKER_PATH;
    if (
      !node ||
      !worker ||
      !Bun.env.MEDIA_PLAYWRIGHT_MODULE ||
      !Bun.env.MEDIA_BROWSER_EXECUTABLE
    )
      throw new Error("Browser proof configuration required");
    const child = Bun.spawn([node, worker], {
      stdin: new Blob([
        JSON.stringify({
          module: Bun.env.MEDIA_PLAYWRIGHT_MODULE,
          executable: Bun.env.MEDIA_BROWSER_EXECUTABLE,
          origin,
          slug,
          qualityProof: Bun.env.MEDIA_PLAYBACK_QUALITY_PROOF === "1",
          longSeconds: Number(
            Bun.env.MEDIA_PLAYBACK_LONG_DURATION_SECONDS ?? 0,
          ),
        }),
      ]),
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(child.stdout).text();
    if ((await child.exited) !== 0) {
      console.error(
        (await new Response(child.stderr).text())
          .replace(/https?:\/\/\S+/g, "[REDACTED_URL]")
          .slice(0, 400),
      );
      throw new Error("HLS browser proof failed");
    }
    const result = JSON.parse(output);
    expect(result.played).toBe(true);
    expect(result.paused).toBe(true);
    const longSeconds = Number(
      Bun.env.MEDIA_PLAYBACK_LONG_DURATION_SECONDS ?? 0,
    );
    expect(result.renewals).toBeGreaterThanOrEqual(longSeconds ? 1 : 2);
    expect(result.position).toBeGreaterThan(longSeconds ? longSeconds - 5 : 7);
    expect(result.position).toBeLessThan(longSeconds ? longSeconds - 3 : 9);
    expect(result.payloads).toBeGreaterThan(0);
    expect(result.privatePlaylists).toBe(true);
    if (!longSeconds) expect(result.deniedStopsRenewal).toBe(true);
    expect(result.qualityLabels).toBe(true);
  } finally {
    web.kill("SIGTERM");
    await web.exited;
    server.stop(true);
  }
}
