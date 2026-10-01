import { loadDatabaseUrl } from "../../config/env";
import { createDatabase } from "../../db/client";
import { AdminProvisionConflictError, provisionAdmin } from "./admin-provision";
import { readHiddenPassword } from "./cli-input";

async function main() {
  const [email, ...extraArgs] = Bun.argv.slice(2);
  if (!email || extraArgs.length > 0) {
    console.error(
      "Usage: bun run --cwd apps/api admin:provision -- <admin-email> (password from hidden prompt or stdin)",
    );
    process.exitCode = 1;
    return;
  }

  const password = await readHiddenPassword();
  const { client, db } = createDatabase(loadDatabaseUrl());
  try {
    const result = await provisionAdmin(db, { email, password });
    console.info(
      result.status === "created"
        ? "Admin provisioned."
        : "Admin already provisioned; existing password unchanged.",
    );
  } catch (error) {
    if (error instanceof AdminProvisionConflictError) {
      console.error(
        "Admin provisioning conflict: one identity is already configured.",
      );
    } else {
      console.error(
        "Admin provisioning failed. Check the email, password, schema, and database setup.",
      );
    }
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

if (import.meta.main) await main();
