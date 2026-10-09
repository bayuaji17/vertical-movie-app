import { expect, test } from "bun:test";
import { SQL } from "bun";
import { mkdtemp, mkdir, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { contentTestUrl } from "./content-fixture";
import { applyDatabaseMigrations } from "../../src/db/migrate";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "../../src/db/schema";
import { seedDashboard } from "./admin-dashboard-fixture";

test("populated upgrade preserves every existing table; defaults, Unicode limits and rerun", async () => {
  const url = contentTestUrl(),
    sql = new SQL(url);
  const folder = await mkdtemp(resolve(tmpdir(), "settings-upgrade-"));
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
    const base = resolve(import.meta.dir, "../../drizzle");
    const journal = await Bun.file(resolve(base, "meta/_journal.json")).json();
    journal.entries = journal.entries.filter(
      (e: { idx: number }) => e.idx < 11,
    );
    await mkdir(resolve(folder, "meta"));
    await Bun.write(
      resolve(folder, "meta/_journal.json"),
      JSON.stringify(journal),
    );
    for (const e of journal.entries)
      await cp(resolve(base, e.tag + ".sql"), resolve(folder, e.tag + ".sql"));
    await applyDatabaseMigrations(url, folder);
    await sql`INSERT INTO "user" (id,name,email,role,created_at,updated_at) VALUES ('settings-upgrade','Existing','upgrade@example.test','admin',now(),now())`;
    await sql`INSERT INTO genres (id,name,slug) VALUES ('10000000-0000-4000-8000-000000000001','Existing','existing')`;
    await sql`INSERT INTO account (id,account_id,provider_id,user_id,created_at,updated_at) VALUES ('upgrade-account','settings-upgrade','credential','settings-upgrade',now(),now())`;
    await sql`INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES ('upgrade-session','test-upgrade-token','settings-upgrade',now()+interval '1 day',now(),now())`;
    await seedDashboard(
      { client: sql, db: drizzle({ client: sql, schema }) },
      "settings-upgrade",
    );
    const tables =
      await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
    const before = new Map<string, string>();
    for (const t of tables)
      before.set(
        t.tablename,
        JSON.stringify(
          await sql.unsafe(
            `SELECT row_to_json(t) AS row FROM "${t.tablename}" t ORDER BY row_to_json(t)::text`,
          ),
        ),
      );
    await applyDatabaseMigrations(url);
    await applyDatabaseMigrations(url);
    for (const t of tables)
      expect(
        JSON.stringify(
          await sql.unsafe(
            `SELECT row_to_json(t) AS row FROM "${t.tablename}" t ORDER BY row_to_json(t)::text`,
          ),
        ),
      ).toBe(before.get(t.tablename)!);
    const rows = await sql`SELECT * FROM site_settings`;
    expect(rows).toHaveLength(1);
    expect(rows[0].site_name).toBe("Vertical Movie");
    expect(rows[0].row_version).toBe(1);
    for (const statement of [
      "UPDATE site_settings SET id=2",
      "UPDATE site_settings SET site_name=''",
      "UPDATE site_settings SET row_version=0",
      "UPDATE site_settings SET tagline=repeat('x',161)",
      "UPDATE site_settings SET description=repeat('x',501)",
      "UPDATE site_settings SET footer_text=repeat('x',301)",
      "UPDATE site_settings SET site_name=repeat('😀',81)",
    ])
      await expect(Promise.resolve(sql.unsafe(statement))).rejects.toThrow();
    await sql`UPDATE site_settings SET site_name=repeat('😀',80)`;
    await applyDatabaseMigrations(url);
    expect(
      (await sql`SELECT char_length(site_name) AS length FROM site_settings`)[0]
        .length,
    ).toBe(80);
    expect(
      (
        await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`
      )[0].n,
    ).toBe(12);
  } finally {
    await sql.close();
    await rm(folder, { recursive: true, force: true });
  }
}, 30000);
