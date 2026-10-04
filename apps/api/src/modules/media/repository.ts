import { and, eq, lt, isNull, inArray, or, sql } from "drizzle-orm";
import {
  mediaAssets,
  uploadSessions,
  videos,
  series,
  mediaJobs,
  mediaRenditions,
  mediaJobAttempts,
} from "../../db/schema";
import type {
  ContentConnection,
  ContentDatabase,
} from "../../shared/content-db";
import { ContentError, notFound } from "../../shared/content-error";
import { VideosStore } from "../videos/repository";
import type { Owner, UploadKind } from "./policy";
export type UploadRow = typeof uploadSessions.$inferSelect;
export type AssetRow = typeof mediaAssets.$inferSelect;
export class MediaStore {
  constructor(private readonly db: ContentConnection) {}
  async owner(owner: Owner, lock = false) {
    if (owner.ownerType === "series") {
      const q = this.db
        .select()
        .from(series)
        .where(eq(series.id, owner.ownerId));
      const [r] = await (lock ? q.for("update") : q);
      if (!r) notFound();
      return {
        kind: undefined,
        archived: r.archivedAt !== null,
        status: r.publicationStatus,
        id: r.id,
      };
    }
    const store = new VideosStore(this.db);
    const initial = await store.get(owner.ownerId);
    if (!initial) notFound();
    let archived = false;
    if (initial.seasonId) {
      const [p] = await store.parents([initial.seasonId], lock);
      if (!p) notFound();
      archived = !!(p.parent.archivedAt || p.season.archivedAt);
    }
    const r = lock ? await store.get(owner.ownerId, true) : initial;
    if (!r) notFound();
    if (r.seasonId !== initial.seasonId)
      throw new ContentError(
        "CONTENT_VERSION_CONFLICT",
        "Grouping has changed.",
      );
    return {
      kind: r.kind,
      archived: archived || r.archivedAt !== null,
      status: r.publicationStatus,
      id: r.id,
    };
  }
  async session(id: string, lock = false) {
    const q = this.db
      .select()
      .from(uploadSessions)
      .where(eq(uploadSessions.id, id));
    return (await (lock ? q.for("update") : q))[0];
  }
  async sessionForAsset(assetId: string) {
    return (
      await this.db
        .select()
        .from(uploadSessions)
        .where(eq(uploadSessions.assetId, assetId))
    )[0];
  }
  async replay(actor: string, key: string) {
    return (
      await this.db
        .select()
        .from(uploadSessions)
        .where(
          and(
            eq(uploadSessions.actorId, actor),
            eq(uploadSessions.idempotencyKey, key),
          ),
        )
    )[0];
  }
  async active(owner: Owner, kind: UploadKind) {
    return (
      await this.db
        .select()
        .from(uploadSessions)
        .where(
          and(
            owner.ownerType === "video"
              ? eq(uploadSessions.videoId, owner.ownerId)
              : eq(uploadSessions.seriesId, owner.ownerId),
            eq(uploadSessions.kind, kind),
            inArray(uploadSessions.status, [
              "initializing",
              "pending",
              "completing",
              "aborting",
            ]),
          ),
        )
    )[0];
  }
  async asset(id: string, lock = false) {
    const q = this.db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    return (await (lock ? q.for("update") : q))[0];
  }
  async insertAsset(values: typeof mediaAssets.$inferInsert) {
    await this.db.insert(mediaAssets).values({
      ...values,
      ...(values.facts
        ? { facts: sql`${JSON.stringify(values.facts)}::text::jsonb` }
        : {}),
    });
  }
  async insertSession(values: typeof uploadSessions.$inferInsert) {
    const [r] = await this.db.insert(uploadSessions).values(values).returning();
    return r;
  }
  async updateSession(
    id: string,
    values: Partial<typeof uploadSessions.$inferInsert>,
  ) {
    const [r] = await this.db
      .update(uploadSessions)
      .set(values)
      .where(eq(uploadSessions.id, id))
      .returning();
    return r;
  }
  async updateAsset(
    id: string,
    values: Partial<typeof mediaAssets.$inferInsert>,
  ) {
    await this.db
      .update(mediaAssets)
      .set({
        ...values,
        ...(values.facts !== undefined && values.facts !== null
          ? { facts: sql`${JSON.stringify(values.facts)}::text::jsonb` }
          : {}),
      })
      .where(eq(mediaAssets.id, id));
  }
  async activate(
    owner: Owner,
    kind: UploadKind,
    assetId: string,
    actor: string,
    now: Date,
  ) {
    if (owner.ownerType === "series")
      await this.db
        .update(series)
        .set({
          posterAssetId: assetId,
          updatedBy: actor,
          updatedAt: now,
          rowVersion: sql`${series.rowVersion}+1`,
        })
        .where(eq(series.id, owner.ownerId));
    else
      await this.db
        .update(videos)
        .set({
          ...(kind === "source"
            ? { sourceAssetId: assetId }
            : { posterAssetId: assetId }),
          updatedBy: actor,
          updatedAt: now,
          rowVersion: sql`${videos.rowVersion}+1`,
        })
        .where(eq(videos.id, owner.ownerId));
  }
  async activeJobs(assetId: string) {
    return (
      (
        await this.db
          .select({ id: mediaJobs.id })
          .from(mediaJobs)
          .where(
            and(
              eq(mediaJobs.assetId, assetId),
              inArray(mediaJobs.state, ["queued", "running", "retry"]),
            ),
          )
          .limit(1)
      ).length > 0
    );
  }
  async enqueue(
    assetId: string,
    generation: number,
    kind: UploadKind,
    now: Date,
  ) {
    await this.db
      .insert(mediaJobs)
      .values({
        id: crypto.randomUUID(),
        assetId,
        generation,
        kind,
        runAfter: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [mediaJobs.assetId, mediaJobs.generation],
      });
  }
  async assetJob(assetId: string, generation: number) {
    return (
      await this.db
        .select()
        .from(mediaJobs)
        .where(
          and(
            eq(mediaJobs.assetId, assetId),
            eq(mediaJobs.generation, generation),
          ),
        )
    )[0];
  }
  async job(id: string, lock = false) {
    const q = this.db.select().from(mediaJobs).where(eq(mediaJobs.id, id));
    return (await (lock ? q.for("update") : q))[0];
  }
  async finishJob(id: string, values: Partial<typeof mediaJobs.$inferInsert>) {
    await this.db
      .update(mediaJobs)
      .set({
        ...values,
        ...(values.outputFiles
          ? {
              outputFiles: sql`${JSON.stringify(values.outputFiles)}::text::jsonb`,
            }
          : {}),
      })
      .where(eq(mediaJobs.id, id));
  }
  async stopAttempt(token: string, now: Date) {
    await this.db
      .update(mediaJobAttempts)
      .set({ stoppedAt: now })
      .where(eq(mediaJobAttempts.token, token));
  }
  async insertRenditions(values: (typeof mediaRenditions.$inferInsert)[]) {
    if (values.length) await this.db.insert(mediaRenditions).values(values);
  }
  async cleanupCandidates(now: Date) {
    return this.db
      .select()
      .from(uploadSessions)
      .where(
        and(
          isNull(uploadSessions.cleanedAt),
          or(
            and(
              inArray(uploadSessions.status, [
                "initializing",
                "pending",
                "completing",
                "aborting",
              ]),
              lt(uploadSessions.expiresAt, now),
            ),
            and(
              inArray(uploadSessions.status, [
                "aborted",
                "expired",
                "failed",
                "completed",
              ]),
              lt(uploadSessions.updatedAt, new Date(now.getTime() - 86400000)),
            ),
          ),
        ),
      )
      .limit(100);
  }
}
export interface MediaRepository {
  store: MediaStore;
  transact<T>(action: (store: MediaStore) => Promise<T>): Promise<T>;
}
export function createMediaRepository(db: ContentDatabase): MediaRepository {
  return {
    store: new MediaStore(db),
    transact: (action) => db.transaction((tx) => action(new MediaStore(tx))),
  };
}
