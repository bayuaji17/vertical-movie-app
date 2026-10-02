import assert from "node:assert/strict";
import { createAdminAuthServer } from "@repo/auth/server";
import { createApp } from "../../src/app";
import { database, client, config, resetDatabase } from "./operator-fixture";
import { resolve } from "node:path";

// operator-fixture refuses any host/database except the dedicated local proof DB.
const node = process.env.AUTH_BROWSER_NODE;
const module = process.env.AUTH_PLAYWRIGHT_MODULE;
const executable = process.env.AUTH_BROWSER_EXECUTABLE;
const workerPath = process.env.AUTH_BROWSER_WORKER_PATH;
assert.ok(
  node && module && executable && workerPath,
  "Provide the installed browser runner configuration.",
);
const reserve = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: () => new Response(),
});
const port = reserve.port;
reserve.stop(true);
const publicOrigin = `http://127.0.0.1:${port}`;
let reads = 0;
let child;
let api;
try {
  await resetDatabase();
  const auth = createAdminAuthServer({
    ...config,
    database,
    origin: publicOrigin,
  });
  for (const role of ["admin", "user"]) {
    await auth.api.createUser({
      body: {
        email: `${role}@native.example.test`,
        name: role,
        role,
        password: "NativeBrowserFixture123456",
      },
    });
  }
  const app = createApp({ auth });
  api = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/counts") return Response.json({ reads });
      if (path === "/api/auth/get-session") reads++;
      return app.handle(request);
    },
  });
  const web = resolve(import.meta.dir, "../../../web");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: String(port),
    VITE_API_URL: publicOrigin,
    API_INTERNAL_URL: `http://127.0.0.1:${api.port}`,
  };
  const build = Bun.spawn([process.execPath, "run", "build"], {
    cwd: web,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, out, err] = await Promise.all([
    build.exited,
    new Response(build.stdout).text(),
    new Response(build.stderr).text(),
  ]);
  assert.equal(code, 0, (out + err).slice(-2000));
  child = Bun.spawn([process.execPath, ".output/server/index.mjs"], {
    cwd: web,
    env,
    stdout: "ignore",
    stderr: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try {
      await fetch(publicOrigin);
      ready = true;
      break;
    } catch {
      await Bun.sleep(100);
    }
  }
  assert.ok(ready, "Built web server must start");
  await Bun.write(
    workerPath,
    await Bun.file(resolve(web, "test/auth-native-browser-worker.mjs")).text(),
  );
  const nativePath = workerPath.replace(
    /^\/mnt\/([a-z])\//,
    (_all, drive) => drive.toUpperCase() + ":/",
  );
  const worker = Bun.spawn(
    [
      node,
      nativePath,
      publicOrigin,
      module,
      executable,
      `http://127.0.0.1:${api.port}`,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [workerCode, output, error] = await Promise.all([
    worker.exited,
    new Response(worker.stdout).text(),
    new Response(worker.stderr).text(),
  ]);
  if (error) console.error(error);
  assert.equal(workerCode, 0, output);
  assert.ok(
    output.includes("Native browser:"),
    "Browser worker must actually execute",
  );
  console.log(output.trim());
} finally {
  child?.kill();
  if (child) await child.exited;
  api?.stop(true);
  await client.close();
}
