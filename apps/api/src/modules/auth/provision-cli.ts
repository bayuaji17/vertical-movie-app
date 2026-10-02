import { resolveAuthCliPath } from "@repo/auth/server";
import { resolve } from "node:path";
import { loadApiEnv } from "../../config/env";

async function main() {
  const [email, name = "Admin", ...extra] = Bun.argv.slice(2);
  if (!email || email.startsWith("-") || name.startsWith("-") || extra.length) {
    console.error(
      "Usage: bun run --cwd apps/api admin:provision -- <admin-email> [name] (native hidden password prompt)",
    );
    process.exitCode = 1;
    return;
  }
  try {
    loadApiEnv();
    const child = Bun.spawn(
      [
        process.execPath,
        resolveAuthCliPath(),
        "create-admin",
        "--cwd",
        resolve(import.meta.dir, "../../.."),
        "--config",
        "src/auth.ts",
        "--email",
        email.trim().toLowerCase(),
        "--name",
        name,
        "--role",
        "admin",
        "--yes",
      ],
      { stdin: "inherit", stdout: "inherit", stderr: "pipe" },
    );
    // Native errors may include database query parameters. Keep the hidden
    // prompt/success output, but replace stderr with a safe operator error.
    const [code] = await Promise.all([
      child.exited,
      new Response(child.stderr).arrayBuffer(),
    ]);
    process.exitCode = code;
    if (code)
      console.error(
        "Admin provisioning failed. An admin may already exist; check the migrated schema and use maintenance recovery if needed.",
      );
  } catch {
    console.error(
      "Admin provisioning failed. Check API configuration and the migrated schema.",
    );
    process.exitCode = 1;
  }
}
if (import.meta.main) await main();
