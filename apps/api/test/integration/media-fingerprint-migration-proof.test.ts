import { test, expect } from "bun:test";
import { SQL } from "bun";
import { mkdtemp, mkdir, cp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { mediaTestUrl } from "./media-fixture";
import { applyDatabaseMigrations } from "../../src/db/migrate";

test("nullable fingerprint migration preserves legacy upload and auth identity without fake backfill", async () => {
  const url = mediaTestUrl(),
    sql = new SQL(url);
  const root = resolve(
    import.meta.dir,
    "../../../../.turbo/admin-media-upload-implementation",
  );
  await mkdir(root, { recursive: true });
  const dir = await mkdtemp(join(root, "migration-"));
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
    const migrations = resolve(import.meta.dir, "../../drizzle");
    const journal = await Bun.file(
      join(migrations, "meta/_journal.json"),
    ).json();
    const end = journal.entries.findIndex(
      (entry: { tag: string }) => entry.tag === "0009_upload-fingerprint",
    );
    if (end < 0) throw new Error("Fingerprint migration unavailable");
    await mkdir(join(dir, "meta"));
    await Bun.write(
      join(dir, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, end) }),
    );
    for (const entry of journal.entries.slice(0, end))
      await cp(
        join(migrations, entry.tag + ".sql"),
        join(dir, entry.tag + ".sql"),
      );
    await applyDatabaseMigrations(url, dir);
    await sql`INSERT INTO "user" (id,name,email,role,created_at,updated_at) VALUES ('legacy-admin','Admin','legacy@example.test','admin',now(),now())`;
    await sql`INSERT INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('legacy-account','legacy-admin','credential','legacy-admin','fixture-password-hash',now(),now())`;
    await sql`INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES ('legacy-session','fixture-token','legacy-admin',now()+interval '1 day',now(),now())`;
    const videoId = crypto.randomUUID(),
      assetId = crypto.randomUUID(),
      sessionId = crypto.randomUUID(),
      requestHash = "a".repeat(64);
    await sql`INSERT INTO videos (id,kind,slug,title,row_version,created_by,updated_by) VALUES (${videoId}::uuid,'movie',${videoId},'Legacy',7,'legacy-admin','legacy-admin')`;
    await sql`INSERT INTO media_assets (id,video_id,kind,provider,bucket,object_key,size_bytes,content_type,created_by) VALUES (${assetId}::uuid,${videoId}::uuid,'source','minio','test-bucket','sources/legacy/original',100,'video/mp4','legacy-admin')`;
    await sql`INSERT INTO upload_sessions (id,asset_id,video_id,kind,actor_id,idempotency_key,request_hash,filename,staging_key,upload_id,status,size_bytes,part_size_bytes,part_count,expires_at) VALUES (${sessionId}::uuid,${assetId}::uuid,${videoId}::uuid,'source','legacy-admin',${crypto.randomUUID()}::uuid,${requestHash},'legacy.mp4','uploads/legacy/original','legacy-provider-upload','pending',100,5242880,1,now()+interval '1 day')`;
    const tables = [
      "user",
      "account",
      "session",
      "videos",
      "media_assets",
      "upload_sessions",
    ];
    const before: Record<string, unknown> = {};
    for (const table of tables)
      before[table] = (
        await sql.unsafe(
          `SELECT to_jsonb(t) AS data FROM "${table}" t ORDER BY to_jsonb(t)::text`,
        )
      ).map((row: { data: Record<string, unknown> }) => row.data);
    await applyDatabaseMigrations(url);
    for (const table of tables) {
      const after = (
        await sql.unsafe(
          `SELECT to_jsonb(t) AS data FROM "${table}" t ORDER BY to_jsonb(t)::text`,
        )
      ).map((row: { data: Record<string, unknown> }) => {
        if (table === "upload_sessions") {
          expect(row.data.expected_sha256).toBeNull();
          expect(row.data.processing_mode).toBe("worker");
          return omit(row.data, ["expected_sha256", "processing_mode"]);
        }
        return row.data;
      });
      expect(after).toEqual(before[table]);
    }
    for (const digest of ["A".repeat(64), "a".repeat(63), "invalid"])
      await expect(
        Promise.resolve(
          sql`UPDATE upload_sessions SET expected_sha256=${digest} WHERE id=${sessionId}::uuid`,
        ),
      ).rejects.toThrow();
    await sql`UPDATE upload_sessions SET expected_sha256=${"b".repeat(64)} WHERE id=${sessionId}::uuid`;
    await applyDatabaseMigrations(url);
    const [session] =
      await sql`SELECT expected_sha256,request_hash,upload_id FROM upload_sessions WHERE id=${sessionId}::uuid`;
    expect(session.expected_sha256).toBe("b".repeat(64));
    expect(session.request_hash).toBe(requestHash);
    expect(session.upload_id).toBe("legacy-provider-upload");
    expect(
      (
        await sql.unsafe(
          "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
        )
      )[0].n,
    ).toBe(journal.entries.length);
  } finally {
    await sql.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);

function omit(row: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !keys.includes(key)),
  );
}
