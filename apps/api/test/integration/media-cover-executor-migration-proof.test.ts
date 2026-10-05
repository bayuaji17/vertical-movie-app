import { test, expect } from "bun:test";
import { SQL } from "bun";
import { mkdtemp, mkdir, cp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { mediaTestUrl } from "./media-fixture";
import { applyDatabaseMigrations } from "../../src/db/migrate";

type Row = Record<string, unknown>;

async function rows(sql: SQL, table: string): Promise<Row[]> {
  return (
    await sql.unsafe(
      `SELECT to_jsonb(t) AS data FROM "${table}" t ORDER BY to_jsonb(t)::text`,
    )
  ).map((row: { data: Row }) => row.data);
}

function omit(row: Row, keys: string[]) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !keys.includes(key)),
  );
}

test("poster executor migration defaults legacy rows and preserves job provenance", async () => {
  const url = mediaTestUrl();
  const sql = new SQL(url);
  const root = resolve(
    import.meta.dir,
    "../../../.turbo/admin-cover-processing-implementation",
  );
  await mkdir(root, { recursive: true });
  const migrationsFolder = await mkdtemp(join(root, "migration-"));

  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");

    const migrations = resolve(import.meta.dir, "../../drizzle");
    const journal = await Bun.file(
      join(migrations, "meta/_journal.json"),
    ).json();
    const executorMigration = journal.entries.findIndex(
      (entry: { tag: string }) => entry.tag === "0010_poster-execution-mode",
    );
    if (executorMigration < 0)
      throw new Error("Poster executor migration is unavailable");

    const baseline = journal.entries.slice(0, executorMigration);
    await mkdir(join(migrationsFolder, "meta"));
    await Bun.write(
      join(migrationsFolder, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: baseline }),
    );
    for (const entry of baseline) {
      await cp(
        join(migrations, `${entry.tag}.sql`),
        join(migrationsFolder, `${entry.tag}.sql`),
      );
    }
    await applyDatabaseMigrations(url, migrationsFolder);

    const videoId = crypto.randomUUID();
    const queuedAssetId = crypto.randomUUID();
    const runningAssetId = crypto.randomUUID();
    const readyAssetId = crypto.randomUUID();
    const pendingUploadId = crypto.randomUUID();
    const completedUploadId = crypto.randomUUID();
    const queuedJobId = crypto.randomUUID();
    const runningJobId = crypto.randomUUID();
    const succeededJobId = crypto.randomUUID();
    const runningLease = crypto.randomUUID();
    const attemptToken = crypto.randomUUID();
    const outputPrefix = `outputs/${readyAssetId}/${succeededJobId}/1`;
    const requestHash = "a".repeat(64);
    const idempotencyKey = crypto.randomUUID();

    await sql`INSERT INTO "user" (id,name,email,role,created_at,updated_at) VALUES ('legacy-admin','Admin','legacy-executor@example.test','admin',now(),now())`;
    await sql`INSERT INTO videos (id,kind,slug,title,row_version,created_by,updated_by) VALUES (${videoId}::uuid,'movie',${`legacy-${videoId}`},'Legacy executor fixture',7,'legacy-admin','legacy-admin')`;
    await sql`INSERT INTO media_assets (id,video_id,kind,provider,bucket,object_key,state,size_bytes,content_type,created_by) VALUES (${queuedAssetId}::uuid,${videoId}::uuid,'source','minio','executor-test','sources/queued','processing',100,'video/mp4','legacy-admin'),(${runningAssetId}::uuid,${videoId}::uuid,'poster','minio','executor-test','posters/running','processing',100,'image/webp','legacy-admin'),(${readyAssetId}::uuid,${videoId}::uuid,'poster','minio','executor-test','posters/succeeded','ready',100,'image/webp','legacy-admin')`;
    await sql`INSERT INTO upload_sessions (id,asset_id,video_id,kind,actor_id,idempotency_key,request_hash,filename,staging_key,upload_id,status,size_bytes,part_size_bytes,part_count,expires_at,completed_at) VALUES (${pendingUploadId}::uuid,${queuedAssetId}::uuid,${videoId}::uuid,'source','legacy-admin',${idempotencyKey}::uuid,${requestHash},'legacy.mp4','uploads/legacy/queued','legacy-upload-pending','pending',100,5242880,1,now()+interval '1 day',NULL),(${completedUploadId}::uuid,${readyAssetId}::uuid,${videoId}::uuid,'poster','legacy-admin',${crypto.randomUUID()}::uuid,${requestHash},'legacy.webp','uploads/legacy/completed','legacy-upload-complete','completed',100,5242880,1,now()+interval '1 day',now())`;
    await sql`INSERT INTO media_jobs (id,asset_id,generation,kind,state,attempts,failures) VALUES (${queuedJobId}::uuid,${queuedAssetId}::uuid,1,'source','queued',0,0)`;
    await sql`INSERT INTO media_jobs (id,asset_id,generation,kind,state,attempts,failures,lease_token,lease_until,started_at) VALUES (${runningJobId}::uuid,${runningAssetId}::uuid,1,'poster','running',1,0,${runningLease}::uuid,now()+interval '2 minutes',now())`;
    await sql`INSERT INTO media_jobs (id,asset_id,generation,kind,state,attempts,failures,output_prefix,output_files,started_at,finished_at) VALUES (${succeededJobId}::uuid,${readyAssetId}::uuid,1,'poster','succeeded',1,0,${outputPrefix},${JSON.stringify([`${outputPrefix}/poster.webp`])}::jsonb,now()-interval '1 minute',now())`;
    await sql`UPDATE media_assets SET ready_job_id=${succeededJobId}::uuid,verified_ready_at=now() WHERE id=${readyAssetId}::uuid`;
    await sql`INSERT INTO media_job_attempts (token,job_id,attempt,output_prefix) VALUES (${attemptToken}::uuid,${succeededJobId}::uuid,1,${outputPrefix})`;

    const tables = [
      "upload_sessions",
      "media_jobs",
      "media_assets",
      "media_job_attempts",
    ];
    const before: Record<string, Row[]> = {};
    for (const table of tables) before[table] = await rows(sql, table);

    await applyDatabaseMigrations(url);

    const afterUploads = await rows(sql, "upload_sessions");
    const afterJobs = await rows(sql, "media_jobs");
    expect(afterUploads.map((row) => row.processing_mode)).toEqual([
      "worker",
      "worker",
    ]);
    expect(afterJobs.map((row) => row.execution_mode)).toEqual([
      "worker",
      "worker",
      "worker",
    ]);
    expect(afterUploads.map((row) => omit(row, ["processing_mode"]))).toEqual(
      before.upload_sessions,
    );
    expect(afterJobs.map((row) => omit(row, ["execution_mode"]))).toEqual(
      before.media_jobs,
    );
    expect(await rows(sql, "media_assets")).toEqual(before.media_assets);
    expect(await rows(sql, "media_job_attempts")).toEqual(
      before.media_job_attempts,
    );

    const [readyLink] = await sql`
      SELECT a.ready_job_id, j.asset_id, j.state
      FROM media_assets a JOIN media_jobs j ON j.id=a.ready_job_id
      WHERE a.id=${readyAssetId}::uuid
    `;
    expect(readyLink).toEqual({
      ready_job_id: succeededJobId,
      asset_id: readyAssetId,
      state: "succeeded",
    });

    await expect(
      Promise.resolve(
        sql`UPDATE upload_sessions SET processing_mode='request' WHERE id=${pendingUploadId}::uuid`,
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve(
        sql`UPDATE media_jobs SET execution_mode='request' WHERE id=${queuedJobId}::uuid`,
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve(
        sql`UPDATE upload_sessions SET processing_mode='inline' WHERE id=${completedUploadId}::uuid`,
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve(
        sql`INSERT INTO media_jobs (id,asset_id,generation,kind,state) VALUES (${crypto.randomUUID()}::uuid,${queuedAssetId}::uuid,1,'source','queued')`,
      ),
    ).rejects.toThrow();

    await sql`UPDATE upload_sessions SET processing_mode='request' WHERE id=${completedUploadId}::uuid`;
    await sql`UPDATE media_jobs SET execution_mode='request' WHERE id=${runningJobId}::uuid`;
    await applyDatabaseMigrations(url);

    const [posterSession] = await sql`
      SELECT processing_mode FROM upload_sessions WHERE id=${completedUploadId}::uuid
    `;
    const [posterJob] = await sql`
      SELECT execution_mode FROM media_jobs WHERE id=${runningJobId}::uuid
    `;
    expect(posterSession.processing_mode).toBe("request");
    expect(posterJob.execution_mode).toBe("request");
    expect(
      (
        await sql.unsafe(
          "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
        )
      )[0].n,
    ).toBe(journal.entries.length);
  } finally {
    await sql.close();
    if (!migrationsFolder.startsWith(root))
      throw new Error("Unsafe proof cleanup");
    await rm(migrationsFolder, { recursive: true, force: true });
  }
}, 60000);
