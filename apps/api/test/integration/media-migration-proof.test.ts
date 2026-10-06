import { test, expect } from "bun:test";
import { SQL } from "bun";
import { mkdtemp, mkdir, cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { mediaTestUrl } from "./media-fixture";
import { applyDatabaseMigrations } from "../../src/db/migrate";
test("publication migration preserves legacy metadata and audit while normalizing video lifecycle", async () => {
  const url = mediaTestUrl(),
    client = new SQL(url),
    root = "/var/tmp/vertical-movie-migration-proof-",
    dir = await mkdtemp(root);
  try {
    await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await client.unsafe("CREATE SCHEMA public");
    await client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
    const migrations = join(import.meta.dir, "../../drizzle"),
      journal = await Bun.file(join(migrations, "meta/_journal.json")).json();
    const publication = journal.entries.findIndex(
      (entry: { tag: string }) => entry.tag === "0008_media-publication",
    );
    if (publication < 0) throw new Error("Publication migration unavailable");
    const previous = {
      ...journal,
      entries: journal.entries.slice(0, publication),
    };
    await mkdir(join(dir, "meta"));
    await Bun.write(join(dir, "meta/_journal.json"), JSON.stringify(previous));
    for (const entry of previous.entries)
      await cp(
        join(migrations, entry.tag + ".sql"),
        join(dir, entry.tag + ".sql"),
      );
    await applyDatabaseMigrations(url, dir);
    await client`INSERT INTO "user"(id,name,email,role,created_at,updated_at) VALUES('media-admin','Admin','migration@example.test','admin',now(),now())`;
    const definitions = [
      ["draft", false],
      ["published", false],
      ["unpublished", false],
      ["draft", true],
    ] as const;
    const ids: string[] = [];
    for (const [status, archived] of definitions) {
      const id = crypto.randomUUID();
      ids.push(id);
      await client`INSERT INTO videos(id,kind,title,slug,synopsis,publication_status,first_published_at,published_at,archived_at,row_version,created_by,updated_by) VALUES(${id}::uuid,'movie','Preserved',${id},'Preserved synopsis',${status},CASE WHEN ${status}!='draft' THEN '2026-01-01'::timestamptz ELSE NULL END,CASE WHEN ${status}='published' THEN '2026-01-01'::timestamptz ELSE NULL END,CASE WHEN ${archived} THEN '2026-02-01'::timestamptz ELSE NULL END,7,'media-admin','media-admin')`;
    }
    const before = await client.unsafe(
      "SELECT id,title,synopsis,row_version,created_by,updated_by,created_at,updated_at,first_published_at FROM videos ORDER BY id",
    );
    const auth = await client.unsafe(
      'SELECT to_jsonb(t)::text AS data FROM "user" t ORDER BY id',
    );
    await applyDatabaseMigrations(url);
    expect(
      await client.unsafe(
        "SELECT id,title,synopsis,row_version,created_by,updated_by,created_at,updated_at,first_published_at FROM videos ORDER BY id",
      ),
    ).toEqual(before);
    expect(
      await client.unsafe(
        'SELECT to_jsonb(t)::text AS data FROM "user" t ORDER BY id',
      ),
    ).toEqual(auth);
    for (let i = 0; i < ids.length; i++) {
      const [row] =
        await client`SELECT publication_status,published_at FROM videos WHERE id=${ids[i]}::uuid`;
      expect(row.publication_status).toBe(
        ["draft", "published", "draft", "archived"][i],
      );
      if (i !== 1) expect(row.published_at).toBeNull();
    }
    await applyDatabaseMigrations(url);
    expect(
      (
        await client.unsafe(
          "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
        )
      )[0].n,
    ).toBe(journal.entries.length);
  } finally {
    await client.close();
    if (!dir.startsWith(root)) throw new Error("Unsafe proof cleanup");
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
