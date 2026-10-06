import { expect, test, spyOn } from "bun:test";
import { PublicationEvidenceStore } from "../../src/modules/publication/readiness";
import { and, eq, sql } from "drizzle-orm";
import { resetMediaDatabase } from "./media-fixture";
import {
  videos,
  mediaAssets,
  mediaJobs,
  contentOperations,
  uploadSessions,
} from "../../src/db/schema";
import { PublicationService } from "../../src/modules/publication/service";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { CatalogService } from "../../src/modules/catalog/service";
import { CatalogStore } from "../../src/modules/catalog/repository";
import { createApp } from "../../src/app";

type Database = Awaited<ReturnType<typeof resetMediaDatabase>>;
const actor = "media-admin";
async function readyVideo(
  db: Database,
  kind: "movie" | "standalone" = "movie",
) {
  const service = new VideosService(createVideosRepository(db.db));
  const video = await service.create(
    {
      kind,
      title: "Publication proof",
      slug: crypto.randomUUID(),
      synopsis: "Verified fixture",
      rightsConfirmed: true,
    },
    actor,
  );
  const assets: {
    source: { id: string; job: string };
    poster: { id: string; job: string };
  } = {
    source: { id: crypto.randomUUID(), job: crypto.randomUUID() },
    poster: { id: crypto.randomUUID(), job: crypto.randomUUID() },
  };
  for (const kind of ["source", "poster"] as const) {
    const { id, job } = assets[kind],
      prefix = `outputs/${id}/${job}/${crypto.randomUUID()}/`;
    await db.db.insert(mediaAssets).values({
      id,
      videoId: video.id,
      kind,
      provider: "minio",
      bucket: "vertical-movie-app-media-test",
      objectKey: `sources/${id}/original`,
      state: "uploaded",
      sizeBytes: 100n,
      contentType: kind === "source" ? "video/mp4" : "image/png",
      createdBy: actor,
    });
    await db.db.insert(mediaJobs).values({
      id: job,
      assetId: id,
      generation: 1,
      kind,
      state: "succeeded",
      outputPrefix: prefix,
      outputFiles:
        kind === "source"
          ? [
              "master.m3u8",
              "0/index.m3u8",
              "0/init_0.mp4",
              "0/segment_000000.m4s",
            ]
          : ["poster.webp"],
      finishedAt: new Date(),
    });
    await db.db
      .update(mediaAssets)
      .set({
        state: "ready",
        readyJobId: job,
        sha256: "a".repeat(64),
        facts: sql`${JSON.stringify(kind === "source" ? { durationMs: 12000, width: 1080, height: 1920 } : { width: 1080, height: 1920, codec: "webp" })}::text::jsonb`,
        verifiedReadyAt: new Date(),
      })
      .where(eq(mediaAssets.id, id));
  }
  await db.db
    .update(videos)
    .set({ sourceAssetId: assets.source.id, posterAssetId: assets.poster.id })
    .where(eq(videos.id, video.id));
  return { id: video.id, assets };
}
test("readiness and locked command share every existing gate without side effects", async () => {
  const db = await resetMediaDatabase();
  try {
    const pub = new PublicationService(db.db);
    const fixture = await readyVideo(db);
    const { id, assets } = fixture;
    const operationsBefore = await db.db.select().from(contentOperations);
    expect((await pub.readiness(id)).canPublish).toBe(true);
    expect(await db.db.select().from(contentOperations)).toEqual(
      operationsBefore,
    );
    const blocked = async (code: string, error = "PUBLICATION_NOT_READY") => {
      const r = await pub.readiness(id);
      expect(r.canPublish).toBe(false);
      expect(r.checks.find((c) => c.code === code)?.status).toBe("blocked");
      await expect(
        pub.publish(
          "video",
          id,
          { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
          actor,
        ),
      ).rejects.toMatchObject({ code: error });
      expect(
        (await db.db.select().from(videos).where(eq(videos.id, id)))[0]
          .rowVersion,
      ).toBe(1);
    };
    await db.db
      .update(videos)
      .set({ synopsis: " \n " })
      .where(eq(videos.id, id));
    await blocked("SYNOPSIS");
    await db.db
      .update(videos)
      .set({ synopsis: "Verified fixture" })
      .where(eq(videos.id, id));
    await db.db
      .update(videos)
      .set({ rightsConfirmedAt: null, rightsConfirmedBy: null })
      .where(eq(videos.id, id));
    await blocked("RIGHTS");
    await db.db
      .update(videos)
      .set({ rightsConfirmedAt: new Date(), rightsConfirmedBy: actor })
      .where(eq(videos.id, id));
    for (const kind of ["source", "poster"] as const) {
      await db.db
        .update(mediaAssets)
        .set({ generation: 2 })
        .where(eq(mediaAssets.id, assets[kind].id));
      await blocked("VERIFIED_MEDIA");
      await db.db
        .update(mediaAssets)
        .set({ generation: 1 })
        .where(eq(mediaAssets.id, assets[kind].id));
      await db.db
        .update(mediaJobs)
        .set({ state: "failed" })
        .where(eq(mediaJobs.id, assets[kind].job));
      await blocked("VERIFIED_MEDIA");
      await db.db
        .update(mediaJobs)
        .set({ state: "succeeded" })
        .where(eq(mediaJobs.id, assets[kind].job));
    }
    await db.db
      .update(mediaAssets)
      .set({ verifiedReadyAt: null })
      .where(eq(mediaAssets.id, assets.source.id));
    await blocked("VERIFIED_MEDIA");
    await db.db
      .update(mediaAssets)
      .set({ verifiedReadyAt: new Date() })
      .where(eq(mediaAssets.id, assets.source.id));
    for (const durationMs of [0, -1, 1.5, 1800001, "invalid"]) {
      await db.db
        .update(mediaAssets)
        .set({
          facts: sql`${JSON.stringify({ durationMs, width: 1080, height: 1920 })}::text::jsonb`,
        })
        .where(eq(mediaAssets.id, assets.source.id));
      await blocked("VERIFIED_MEDIA");
    }
    await db.db
      .update(mediaAssets)
      .set({
        facts: sql`${JSON.stringify({ durationMs: 1800000, width: 1080, height: 1920 })}::text::jsonb`,
        deletedAt: new Date(),
      })
      .where(eq(mediaAssets.id, assets.source.id));
    expect((await pub.readiness(id)).canPublish).toBe(true);
    const uploadId = crypto.randomUUID();
    await db.db.insert(uploadSessions).values({
      id: uploadId,
      assetId: assets.source.id,
      videoId: id,
      kind: "source",
      actorId: actor,
      idempotencyKey: crypto.randomUUID(),
      requestHash: "a".repeat(64),
      filename: "fixture.mp4",
      stagingKey: `uploads/${uploadId}`,
      uploadId: "fixture",
      status: "initializing",
      sizeBytes: 100n,
      partSizeBytes: 5242880n,
      partCount: 1,
      expiresAt: new Date(Date.now() + 86400000),
    });
    for (const status of [
      "initializing",
      "pending",
      "completing",
      "aborting",
    ] as const) {
      await db.db
        .update(uploadSessions)
        .set({ status })
        .where(eq(uploadSessions.id, uploadId));
      await blocked("NO_ACTIVE_UPLOAD", "PUBLICATION_MEDIA_BUSY");
    }
    await db.db
      .update(uploadSessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(uploadSessions.id, uploadId));
    expect((await pub.readiness(id)).canPublish).toBe(true);
    // Stale GET cannot reserve eligibility: metadata changes after the snapshot.
    await db.db.update(videos).set({ rowVersion: 2 }).where(eq(videos.id, id));
    await expect(
      pub.publish(
        "video",
        id,
        { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
        actor,
      ),
    ).rejects.toMatchObject({ code: "CONTENT_VERSION_CONFLICT" });
    const result = await pub.publish(
      "video",
      id,
      { expectedVersion: 2, idempotencyKey: crypto.randomUUID() },
      actor,
    );
    expect(result.rowVersion).toBe(3);
    expect((await pub.readiness(id)).canPublish).toBe(false);
  } finally {
    await db.client.close();
  }
}, 30000);
test("concurrent replay, cross-owner conflicts, archive races and visibility preserve durable state", async () => {
  const db = await resetMediaDatabase();
  try {
    const catalog = new CatalogService(new CatalogStore(db.db)),
      pub = new PublicationService(db.db, catalog.invalidate),
      videoService = new VideosService(
        createVideosRepository(db.db),
        undefined,
        catalog.invalidate,
      );
    const a = await readyVideo(db),
      b = await readyVideo(db, "standalone");
    const key = crypto.randomUUID(),
      input = { expectedVersion: 1, idempotencyKey: key };
    expect((await catalog.list({})).items).toHaveLength(0);
    const replies = await Promise.all(
      Array.from({ length: 4 }, () => pub.publish("video", a.id, input, actor)),
    );
    expect(new Set(replies.map((r) => r.publishedAt)).size).toBe(1);
    expect(replies.every((r) => r.rowVersion === 2)).toBe(true);
    expect(
      await db.db
        .select()
        .from(contentOperations)
        .where(
          and(
            eq(contentOperations.actorId, actor),
            eq(contentOperations.idempotencyKey, key),
          ),
        ),
    ).toHaveLength(1);
    await expect(
      pub.publish("video", b.id, input, actor),
    ).rejects.toMatchObject({ code: "PUBLICATION_IDEMPOTENCY_CONFLICT" });
    await expect(
      pub.publish("video", a.id, { ...input, expectedVersion: 2 }, actor),
    ).rejects.toMatchObject({ code: "PUBLICATION_IDEMPOTENCY_CONFLICT" });
    expect((await catalog.list({})).items).toHaveLength(1);
    const archiveReplies = await Promise.allSettled([
      videoService.archive(a.id, 2, actor),
      videoService.archive(a.id, 2, actor),
    ]);
    expect(archiveReplies.filter((r) => r.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(archiveReplies.filter((r) => r.status === "rejected")).toHaveLength(
      1,
    );
    const archived = await pub.readiness(a.id);
    expect(archived.publicationStatus).toBe("archived");
    expect(archived.rowVersion).toBe(3);
    expect(archived.canPublish).toBe(false);
    const replay = await pub.publish("video", a.id, input, actor);
    expect(replay).toEqual(replies[0]);
    expect((await pub.readiness(a.id)).publicationStatus).toBe("archived");
    expect((await catalog.list({})).items).toHaveLength(0);
    const [row] = await db.db.select().from(videos).where(eq(videos.id, a.id));
    expect(row.firstPublishedAt?.toISOString()).toBe(
      replies[0].firstPublishedAt,
    );
    expect(row.sourceAssetId).toBe(a.assets.source.id);
    expect(row.posterAssetId).toBe(a.assets.poster.id);
    // A draft archive races a publish under the same owner lock: exactly one version-1 command wins.
    const race = await Promise.allSettled([
      pub.publish(
        "video",
        b.id,
        { expectedVersion: 1, idempotencyKey: crypto.randomUUID() },
        actor,
      ),
      videoService.archive(b.id, 1, actor),
    ]);
    expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await pub.readiness(b.id)).rowVersion).toBe(2);
    const app = createApp({
      publicationService: pub,
      getSession: async () => ({
        user: {
          id: actor,
          name: "Admin",
          email: "a@example.test",
          role: "admin",
        },
        session: { expiresAt: new Date(Date.now() + 60000) },
      }),
    });
    const r = await app.handle(
      new Request(`http://localhost/admin/videos/${b.id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    expect(r.status).toBe(409);
  } finally {
    await db.client.close();
  }
}, 30000);

test("read-only readiness uses one repeatable snapshot while command checks current media", async () => {
  const db = await resetMediaDatabase();
  let restore = () => {};
  try {
    const fixture = await readyVideo(db),
      pub = new PublicationService(db.db);
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>((r) => {
        started = r;
      }),
      held = new Promise<void>((r) => {
        release = r;
      });
    const original = PublicationEvidenceStore.prototype.read;
    const spy = spyOn(
      PublicationEvidenceStore.prototype,
      "read",
    ).mockImplementation(async function (
      this: PublicationEvidenceStore,
      video,
      parents,
    ) {
      started();
      await held;
      return original.call(this, video, parents);
    });
    restore = () => spy.mockRestore();
    const read = pub.readiness(fixture.id);
    await entered;
    await db.db
      .update(mediaAssets)
      .set({ generation: 2 })
      .where(eq(mediaAssets.id, fixture.assets.source.id));
    release();
    const old = await read;
    restore();
    expect(old.canPublish).toBe(true);
    expect(old.rowVersion).toBe(1);
    expect((await pub.readiness(fixture.id)).canPublish).toBe(false);
    await expect(
      pub.publish(
        "video",
        fixture.id,
        {
          expectedVersion: old.rowVersion,
          idempotencyKey: crypto.randomUUID(),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: "PUBLICATION_NOT_READY" });
  } finally {
    restore();
    await db.client.close();
  }
}, 30000);
