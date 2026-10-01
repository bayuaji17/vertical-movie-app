import { resolve } from "node:path";

import { migrate } from "drizzle-orm/bun-sql/migrator";

import { loadDatabaseUrl } from "../config/env";
import { createDatabase } from "./client";

const defaultMigrationsFolder = resolve(import.meta.dir, "../../drizzle");

export async function applyDatabaseMigrations(
  databaseUrl: string,
  migrationsFolder = defaultMigrationsFolder,
) {
  const { client, db } = createDatabase(databaseUrl);

  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await client.close();
  }
}

if (import.meta.main) {
  try {
    await applyDatabaseMigrations(loadDatabaseUrl());
    console.info("Database migrations applied.");
  } catch {
    console.error(
      "Database migration failed. Check the migration and database setup.",
    );
    process.exitCode = 1;
  }
}
