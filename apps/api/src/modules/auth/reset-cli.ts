import { loadDatabaseUrl } from "../../config/env";
import { createDatabase } from "../../db/client";
import { readHiddenPassword } from "./cli-input";
import {
  AdminRecoveryUnavailableError,
  resetAdminPassword,
} from "./admin-recovery";

async function main() {
  if (Bun.argv.length > 2) {
    console.error(
      "Usage: bun run --cwd apps/api admin:reset-password (password from hidden prompt or stdin)",
    );
    process.exitCode = 1;
    return;
  }

  let password: string;
  try {
    password = await readHiddenPassword();
  } catch {
    console.error("Admin password input was interrupted.");
    process.exitCode = 1;
    return;
  }

  let database: ReturnType<typeof createDatabase>;
  try {
    database = createDatabase(loadDatabaseUrl());
  } catch {
    console.error(
      "Admin password reset failed. Check the API database configuration.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    await resetAdminPassword(database.db, { password });
    console.info("Admin password reset; all active sessions were revoked.");
  } catch (error) {
    if (error instanceof AdminRecoveryUnavailableError) {
      console.error(
        "Admin password reset unavailable: provision the admin first.",
      );
    } else {
      console.error(
        "Admin password reset failed. Check the password, schema, and database setup.",
      );
    }
    process.exitCode = 1;
  } finally {
    await database.client.close();
  }
}

if (import.meta.main) await main();
