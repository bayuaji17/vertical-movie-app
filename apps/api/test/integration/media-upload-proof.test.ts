import { beforeAll, afterAll, test, expect } from "bun:test";
import { resetMediaDatabase, mediaTestUrl } from "./media-fixture";
import {
  mediaAssets,
  uploadSessions,
  videos,
  series,
} from "../../src/db/schema";
import { createMediaRepository } from "../../src/modules/media/repository";
import { MediaService } from "../../src/modules/media/service";
import { loadStorageEnv } from "../../src/config/storage-env";
import type {
  MultipartStorage,
  UploadedPart,
} from "../../src/storage/multipart";
import { applyDatabaseMigrations } from "../../src/db/migrate";
const actor = { createdBy: "media-admin", updatedBy: "media-admin" };
let db: Awaited<ReturnType<typeof resetMediaDatabase>>;
let now = new Date();
let failFreeze = false;
let failComplete = false;
let parts: UploadedPart[] = [];
const objects = new Map<
  string,
  { sizeBytes: number; etag: string; contentType: string }
>();
let signedTtl = 0;
let initiations = 0;
let freezeCalls = 0;
let blockFreeze: Promise<void> | undefined;
const config = loadStorageEnv({
  STORAGE_PROVIDER: "minio",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "vertical-movie-app-media-test",
  S3_ACCESS_KEY_ID: "test-key",
  S3_SECRET_ACCESS_KEY: "test-secret",
});
const storage: MultipartStorage = {
  listKeys: async () => [],
  put: async () => {},
  initiate: async () => {
    initiations++;
    return "provider-upload";
  },
  findUploads: async () => [],
  signPart: async (_k, _u, _n, ttl) => {
    signedTtl = ttl;
    return "http://localhost/signed";
  },
  listParts: async () => parts,
  complete: async (key) => {
    if (failComplete) {
      failComplete = false;
      throw new Error("outage");
    }
    objects.set(key, {
      sizeBytes: 100,
      etag: '"etag"',
      contentType: "video/mp4",
    });
  },
  abort: async () => {},
  stat: async (key) => {
    const s = objects.get(key);
    if (!s) throw Object.assign(new Error("absent"), { name: "NotFound" });
    return s;
  },
  freeze: async (from, to) => {
    freezeCalls++;
    if (blockFreeze) await blockFreeze;
    if (failFreeze) {
      failFreeze = false;
      throw new Error("outage");
    }
    objects.set(to, objects.get(from)!);
  },
  remove: async (key) => {
    objects.delete(key);
  },
  close: () => {},
};
const runtime = { now: () => now, id: () => crypto.randomUUID() };
function service() {
  return new MediaService(
    createMediaRepository(db.db),
    storage,
    config,
    runtime,
  );
}
async function movie() {
  const id = crypto.randomUUID();
  await db.db
    .insert(videos)
    .values({ id, kind: "movie", title: "Fixture", slug: id, ...actor });
  return id;
}
const input = (id: string, key = crypto.randomUUID()) => ({
  ownerType: "video" as const,
  ownerId: id,
  kind: "source" as const,
  filename: "source.mp4",
  contentType: "video/mp4",
  sizeBytes: "100",
  idempotencyKey: key,
});
beforeAll(async () => {
  db = await resetMediaDatabase();
});
afterAll(async () => {
  await db?.client.close();
});
test("schema enforces ownership, identities, geometry and cross-owner pointers", async () => {
  const v = await movie(),
    other = await movie(),
    id = crypto.randomUUID();
  const base = {
    id,
    videoId: v,
    kind: "source" as const,
    provider: "minio" as const,
    bucket: config.bucket,
    objectKey: "sources/" + id + "/original",
    sizeBytes: 100n,
    contentType: "video/mp4",
    createdBy: "media-admin",
  };
  await db.db.insert(mediaAssets).values(base);
  await expect(
    Promise.resolve(
      db.client`UPDATE videos SET source_asset_id=${id} WHERE id=${other}`,
    ),
  ).rejects.toThrow();
  await db.client`UPDATE videos SET source_asset_id=${id} WHERE id=${v}`;
  await expect(
    db.db
      .insert(mediaAssets)
      .values({ ...base, id: crypto.randomUUID(), videoId: null })
      .execute(),
  ).rejects.toThrow();
  await expect(
    db.db
      .insert(mediaAssets)
      .values({ ...base, id: crypto.randomUUID() })
      .execute(),
  ).rejects.toThrow();
  const session = {
    id: crypto.randomUUID(),
    assetId: id,
    videoId: v,
    kind: "source" as const,
    actorId: "media-admin",
    idempotencyKey: crypto.randomUUID(),
    requestHash: "a".repeat(64),
    filename: "a.mp4",
    stagingKey: "uploads/test/original",
    status: "pending" as const,
    uploadId: "u",
    sizeBytes: 100n,
    partSizeBytes: 5242880n,
    partCount: 1,
    expiresAt: new Date(Date.now() + 100000),
  };
  await expect(
    db.db
      .insert(uploadSessions)
      .values({ ...session, partCount: 2 })
      .execute(),
  ).rejects.toThrow();
  await expect(
    db.db
      .insert(uploadSessions)
      .values({ ...session, videoId: other })
      .execute(),
  ).rejects.toThrow();
  await db.db.insert(uploadSessions).values(session);
  await expect(
    db.db
      .insert(uploadSessions)
      .values({
        ...session,
        id: crypto.randomUUID(),
        stagingKey: "uploads/test2/original",
        idempotencyKey: crypto.randomUUID(),
      })
      .execute(),
  ).rejects.toThrow();
  await applyDatabaseMigrations(mediaTestUrl());
  expect(
    (
      await db.client`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`
    )[0].n,
  ).toBe(9);
}, 30000);
test("same request replays one session, conflicting payload and parallel owner upload reject", async () => {
  const request = input(await movie()),
    svc = service();
  const r = await svc.initiate(request, "media-admin");
  const again = await svc.initiate(request, "media-admin");
  expect(again.id).toBe(r.id);
  expect(initiations).toBe(1);
  await expect(
    svc.initiate({ ...request, filename: "other.mp4" }, "media-admin"),
  ).rejects.toMatchObject({ code: "UPLOAD_IDEMPOTENCY_CONFLICT" });
  const outcomes = await Promise.allSettled([
    svc.initiate(input(request.ownerId), "media-admin"),
    svc.initiate(input(request.ownerId), "media-admin"),
  ]);
  expect(outcomes.every((o) => o.status === "rejected")).toBe(true);
});
test("resume, expiry and completion failures preserve draft until one immutable freeze", async () => {
  const svc = service(),
    request = input(await movie()),
    r = await svc.initiate(request, "media-admin");
  parts = [];
  expect((await svc.part(r.id, 1, "media-admin")).alreadyUploaded).toBe(false);
  expect(signedTtl).toBe(900);
  parts = [{ partNumber: 1, etag: '"etag"', sizeBytes: 100 }];
  expect((await svc.status(r.id, "media-admin")).uploadedBytes).toBe("100");
  expect((await svc.part(r.id, 1, "media-admin")).url).toBeNull();
  failComplete = true;
  await expect(svc.complete(r.id, "media-admin")).rejects.toMatchObject({
    httpStatus: 503,
  });
  expect((await svc.status(r.id, "media-admin")).status).toBe("pending");
  failFreeze = true;
  await expect(svc.complete(r.id, "media-admin")).rejects.toMatchObject({
    httpStatus: 503,
  });
  expect((await svc.status(r.id, "media-admin")).status).toBe("completing");
  const completed = await svc.complete(r.id, "media-admin");
  expect(completed.status).toBe("completed");
  const calls = freezeCalls;
  expect((await svc.complete(r.id, "media-admin")).id).toBe(r.id);
  expect(freezeCalls).toBe(calls);
  const row = (
    await db.client`SELECT publication_status,source_asset_id FROM videos WHERE id=${request.ownerId}`
  )[0];
  expect(row.publication_status).toBe("draft");
  expect(row.source_asset_id).toBe(r.assetId);
  await expect(svc.abort(r.id, "media-admin")).rejects.toThrow();
  const expired = await svc.initiate(input(await movie()), "media-admin");
  now = new Date(now.getTime() + 86400000);
  await expect(svc.part(expired.id, 1, "media-admin")).rejects.toMatchObject({
    code: "UPLOAD_EXPIRED",
  });
  expect((await svc.abort(expired.id, "media-admin", true)).status).toBe(
    "expired",
  );
  now = new Date();
});
test("concurrent completion and abort cannot activate a stale claim", async () => {
  const svc = service(),
    request = input(await movie()),
    r = await svc.initiate(request, "media-admin");
  parts = [{ partNumber: 1, etag: '"etag"', sizeBytes: 100 }];
  let release!: () => void;
  blockFreeze = new Promise<void>((resolve) => {
    release = resolve;
  });
  const attempt = svc.complete(r.id, "media-admin");
  for (let i = 0; i < 100; i++) {
    if ((await svc.status(r.id, "media-admin")).status === "completing") break;
    await Bun.sleep(10);
  }
  await expect(svc.complete(r.id, "media-admin")).rejects.toMatchObject({
    code: "UPLOAD_STATE_CONFLICT",
  });
  await expect(svc.abort(r.id, "media-admin")).rejects.toThrow();
  now = new Date(now.getTime() + 301000);
  expect((await svc.abort(r.id, "media-admin")).status).toBe("aborted");
  release();
  await expect(attempt).rejects.toMatchObject({
    code: "UPLOAD_STATE_CONFLICT",
  });
  blockFreeze = undefined;
  now = new Date();
  expect(
    (
      await db.client`SELECT source_asset_id FROM videos WHERE id=${request.ownerId}`
    )[0].source_asset_id,
  ).toBeNull();
});
test("owner inventory separates current media from replacements and hides other actors", async () => {
  const svc = service(),
    ownerId = await movie(),
    owner = { ownerType: "video" as const, ownerId };
  const empty = await svc.ownerMedia(owner, "media-admin");
  expect(empty.source?.current).toBeNull();
  expect(empty.canPreview).toBe(false);
  expect(empty.canUpload).toBe(true);
  expect(empty.config.source.maxBytes).toBe("1500000000");
  const initial = await svc.initiate(input(ownerId), "media-admin");
  const discovered = await svc.ownerMedia(owner, "media-admin");
  expect(discovered.source?.active?.id).toBe(initial.id);
  const encoded = JSON.stringify(discovered);
  for (const forbidden of [
    "provider-upload",
    "uploads/",
    "sources/",
    "test-key",
    "test-secret",
    "claimToken",
    "stagingKey",
    "uploadId",
    "bucket",
  ])
    expect(encoded).not.toContain(forbidden);
  const another = await svc.ownerMedia(owner, "another-actor");
  expect(another.source?.active).toBeNull();
  expect(another.source?.lastAttempt).toBeNull();
  expect(another.source?.busy).toBe(true);
  await expect(svc.status(initial.id, "another-actor")).rejects.toMatchObject({
    httpStatus: 404,
  });
  parts = [{ partNumber: 1, etag: '"etag"', sizeBytes: 100 }];
  await svc.complete(initial.id, "media-admin");
  now = new Date(now.getTime() + 1);
  const replacement = await svc.initiate(input(ownerId), "media-admin");
  const pending = await svc.ownerMedia(owner, "media-admin");
  expect(pending.source?.current?.id).toBe(initial.assetId);
  expect(pending.source?.current?.processing.jobState).toBe("queued");
  expect(pending.source?.active?.id).toBe(replacement.id);
  expect(pending.rowVersion).toBe(empty.rowVersion + 1);
  await svc.abort(replacement.id, "media-admin");
  await db.client`UPDATE upload_sessions SET status='failed',failure_code='UPLOAD_INVALID_OBJECT' WHERE id=${replacement.id}`;
  const failed = await svc.ownerMedia(owner, "media-admin");
  expect(failed.source?.current?.id).toBe(initial.assetId);
  expect(failed.source?.active).toBeNull();
  expect(failed.source?.lastAttempt?.failureCode).toBe("UPLOAD_INVALID_OBJECT");
  await db.client`UPDATE videos SET publication_status='archived',archived_at=now() WHERE id=${ownerId}`;
  expect((await svc.ownerMedia(owner, "media-admin")).canUpload).toBe(false);
  const mismatch = new MediaService(createMediaRepository(db.db), storage, {
    ...config,
    bucket: "another-bucket",
  });
  await expect(mismatch.ownerMedia(owner, "media-admin")).rejects.toMatchObject(
    { code: "STORAGE_PROFILE_CONFLICT" },
  );
  const seriesId = crypto.randomUUID();
  await db.db
    .insert(series)
    .values({ id: seriesId, title: "Series", slug: seriesId, ...actor });
  expect(
    (
      await svc.ownerMedia(
        { ownerType: "series", ownerId: seriesId },
        "media-admin",
      )
    ).source,
  ).toBeNull();
  await expect(
    svc.ownerMedia(
      { ownerType: "video", ownerId: crypto.randomUUID() },
      "media-admin",
    ),
  ).rejects.toMatchObject({ httpStatus: 404 });
});
test("preview inventory follows output provenance and survives original retention; snapshot is consistent", async () => {
  const owner = { ownerType: "video" as const, ownerId: await movie() },
    repo = createMediaRepository(db.db),
    svc = service();
  for (const kind of ["source", "poster"] as const) {
    const id = crypto.randomUUID();
    await repo.store.insertAsset({
      id,
      videoId: owner.ownerId,
      kind,
      provider: config.provider,
      bucket: config.bucket,
      objectKey: "sources/" + id + "/original",
      sizeBytes: 100n,
      contentType: kind === "source" ? "video/mp4" : "image/png",
      createdBy: "media-admin",
      state: "ready",
      sha256: "a".repeat(64),
      verifiedReadyAt: new Date(),
      facts: { durationMs: 1000, width: 1080, height: 1920 },
    });
    await repo.store.enqueue(id, 1, kind, new Date());
    const job = (await repo.store.assetJob(id, 1))!;
    const prefix =
      "outputs/" + id + "/" + job.id + "/" + crypto.randomUUID() + "/";
    const files = JSON.stringify(
      kind === "source" ? ["master.m3u8", "0/index.m3u8"] : ["poster.webp"],
    );
    await db.client`UPDATE media_jobs SET state='succeeded',output_prefix=${prefix},output_files=${files}::text::jsonb,finished_at=now() WHERE id=${job.id}`;
    await repo.store.updateAsset(id, { readyJobId: job.id });
    await repo.store.activate(owner, kind, id, "media-admin", new Date());
  }
  const ready = await svc.ownerMedia(owner, "media-admin");
  expect(ready.canPreview).toBe(true);
  const sourceId = ready.source!.current!.id,
    posterId = ready.poster.current!.id;
  await repo.store.updateAsset(sourceId, { deletedAt: new Date() });
  const retained = await svc.ownerMedia(owner, "media-admin");
  expect(retained.canPreview).toBe(true);
  expect(retained.source?.current?.originalAvailable).toBe(false);
  await db.client`UPDATE media_jobs SET output_files='[]'::jsonb WHERE asset_id=${posterId}`;
  expect((await svc.ownerMedia(owner, "media-admin")).canPreview).toBe(false);
  await db.client`UPDATE media_jobs SET output_files='["poster.webp"]'::jsonb WHERE asset_id=${posterId}`;
  await db.client`UPDATE media_jobs SET output_prefix='outputs/wrong/' WHERE asset_id=${sourceId}`;
  expect((await svc.ownerMedia(owner, "media-admin")).canPreview).toBe(false);
  await repo.snapshot(async (store) => {
    expect((await store.owner(owner)).status).toBe("draft");
    await db.client`UPDATE videos SET publication_status='archived',archived_at=now() WHERE id=${owner.ownerId}`;
    expect((await store.owner(owner)).status).toBe("draft");
  });
  expect((await svc.ownerMedia(owner, "media-admin")).canUpload).toBe(false);
});
