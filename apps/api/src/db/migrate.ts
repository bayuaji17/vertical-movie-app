import { resolve } from "node:path";
import { mkdtemp, cp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

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

/** Bounded auth expansion, allowing native cutover before removing the singleton. */
export async function applyAuthExpandMigration(databaseUrl: string) {
  const folder = await mkdtemp(resolve(tmpdir(), "auth-expand-"));
  try {
    const journal = await Bun.file(
      resolve(defaultMigrationsFolder, "meta/_journal.json"),
    ).json();
    const end = journal.entries.findIndex(
      (entry: { tag: string }) => entry.tag === "0001_native-admin-expand",
    );
    if (end < 0) throw new Error("Auth expand migration is unavailable.");
    journal.entries = journal.entries.slice(0, end + 1);
    await mkdir(resolve(folder, "meta"));
    await Bun.write(
      resolve(folder, "meta/_journal.json"),
      JSON.stringify(journal),
    );
    for (const entry of journal.entries) {
      await cp(
        resolve(defaultMigrationsFolder, `${entry.tag}.sql`),
        resolve(folder, `${entry.tag}.sql`),
      );
    }
    await applyDatabaseMigrations(databaseUrl, folder);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  try {
    const args = Bun.argv.slice(2);
    if (
      args.length > 1 ||
      (args[0] && !["--stage=expand", "--stage=contract"].includes(args[0]))
    ) {
      throw new Error("Usage: db:migrate [--stage=expand|--stage=contract]");
    }
    if (args[0] === "--stage=expand")
      await applyAuthExpandMigration(loadDatabaseUrl());
    else await applyDatabaseMigrations(loadDatabaseUrl());
    console.info("Database migrations applied.");
  } catch {
    console.error(
      "Database migration failed. Check the migration and database setup.",
    );
    process.exitCode = 1;
  }
}
