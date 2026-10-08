import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { videos, series, contentOperations } from "../../db/schema";
import type { ContentDatabase } from "../../shared/content-db";
import { VideosStore } from "../videos/repository";
import {
  ContentError,
  notFound,
  unavailable,
} from "../../shared/content-error";
import type {
  PublishInput,
  PublicationResult,
  PublicationReadiness,
  SeriesPublicationReadiness,
} from "./model";
import {
  assertVideoPublication,
  assessVideoPublication,
  PublicationEvidenceStore,
  assertSeriesPublication,
  assessSeriesPublication,
  SeriesPublicationEvidenceStore,
} from "./readiness";
export class PublicationService {
  constructor(
    private readonly db?: ContentDatabase,
    private readonly invalidate = () => {},
  ) {}
  async readiness(id: string): Promise<PublicationReadiness> {
    if (!this.db) unavailable();
    try {
      return await this.db.transaction(
        async (tx) => {
          const row = await new VideosStore(tx).get(id);
          if (!row) notFound();
          const evidence = await new PublicationEvidenceStore(tx).read(row);
          return {
            videoId: row.id,
            kind: row.kind,
            rowVersion: row.rowVersion,
            publicationStatus: row.publicationStatus,
            archivedAt: row.archivedAt?.toISOString() ?? null,
            ...assessVideoPublication(evidence),
          };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      );
    } catch (error) {
      if (error instanceof ContentError) throw error;
      unavailable();
    }
  }
  async seriesReadiness(id: string): Promise<SeriesPublicationReadiness> {
    if (!this.db) unavailable();
    try {
      return await this.db.transaction(
        async (tx) => {
          const [row] = await tx.select().from(series).where(eq(series.id, id));
          if (!row) notFound();
          const evidence = await new SeriesPublicationEvidenceStore(tx).read(
            row,
          );
          return {
            seriesId: row.id,
            ownerType: "series" as const,
            rowVersion: row.rowVersion,
            publicationStatus: row.publicationStatus,
            archivedAt: row.archivedAt?.toISOString() ?? null,
            ...assessSeriesPublication(evidence),
          };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      );
    } catch (error) {
      if (error instanceof ContentError) throw error;
      unavailable();
    }
  }
  async publish(
    type: "video" | "series",
    id: string,
    input: PublishInput,
    actor: string,
  ): Promise<PublicationResult> {
    if (!this.db) unavailable();
    const hash = createHash("sha256")
      .update(JSON.stringify(["publish", type, id, input.expectedVersion]))
      .digest("hex");
    const result = await this.db.transaction(async (tx) => {
      const replay = (
        await tx
          .select()
          .from(contentOperations)
          .where(
            and(
              eq(contentOperations.actorId, actor),
              eq(contentOperations.idempotencyKey, input.idempotencyKey),
            ),
          )
      )[0];
      if (replay) {
        if (replay.requestHash !== hash)
          throw new ContentError(
            "PUBLICATION_IDEMPOTENCY_CONFLICT",
            "Idempotency key has another payload.",
          );
        return replay.result as PublicationResult;
      }
      let row;
      if (type === "video") {
        const store = new VideosStore(tx),
          initial = await store.get(id);
        if (!initial) notFound();
        if (initial.seasonId) {
          const [p] = await store.parents([initial.seasonId], true);
          if (!p || p.parent.archivedAt || p.season.archivedAt) notFound();
        }
        const old = await store.get(id, true);
        if (!old) notFound();
        if (old.seasonId !== initial.seasonId)
          throw new ContentError(
            "CONTENT_VERSION_CONFLICT",
            "Grouping changed.",
          );
        row = old;
      } else {
        row = (
          await tx.select().from(series).where(eq(series.id, id)).for("update")
        )[0];
        if (!row) notFound();
      }
      // Recheck idempotency after acquiring the owner lock to serialize same-owner replay.
      const saved = (
        await tx
          .select()
          .from(contentOperations)
          .where(
            and(
              eq(contentOperations.actorId, actor),
              eq(contentOperations.idempotencyKey, input.idempotencyKey),
            ),
          )
      )[0];
      if (saved) {
        if (saved.requestHash !== hash)
          throw new ContentError(
            "PUBLICATION_IDEMPOTENCY_CONFLICT",
            "Idempotency key has another payload.",
          );
        return saved.result as PublicationResult;
      }
      if (row.archivedAt || row.publicationStatus !== "draft")
        throw new ContentError(
          "PUBLICATION_STATE_CONFLICT",
          "Only an active draft can be published.",
        );
      if (row.rowVersion !== input.expectedVersion)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Content has changed.",
        );
      if (!row.title.trim() || !row.synopsis?.trim())
        throw new ContentError(
          "PUBLICATION_NOT_READY",
          "Title and synopsis are required.",
        );
      if (type === "video") {
        const evidence = await new PublicationEvidenceStore(tx).read(
          row as typeof videos.$inferSelect,
          true,
        );
        assertVideoPublication(evidence, input.expectedVersion);
      } else {
        assertSeriesPublication(
          await new SeriesPublicationEvidenceStore(tx).read(
            row as typeof series.$inferSelect,
          ),
          input.expectedVersion,
        );
      }
      const now = new Date(),
        table = type === "video" ? videos : series;
      await tx
        .update(table)
        .set({
          publicationStatus: "published",
          firstPublishedAt: row.firstPublishedAt ?? now,
          publishedAt: now,
          rowVersion: row.rowVersion + 1,
          updatedBy: actor,
          updatedAt: now,
        })
        .where(eq(table.id, id));
      const dto: PublicationResult = {
        id,
        publicationStatus: "published",
        rowVersion: row.rowVersion + 1,
        publishedAt: now.toISOString(),
        firstPublishedAt: (row.firstPublishedAt ?? now).toISOString(),
      };
      await tx.insert(contentOperations).values({
        id: crypto.randomUUID(),
        ...(type === "video" ? { videoId: id } : { seriesId: id }),
        actorId: actor,
        idempotencyKey: input.idempotencyKey,
        requestHash: hash,
        action: "publish",
        result: sql`${JSON.stringify(dto)}::text::jsonb`,
      });
      return dto;
    });
    this.invalidate();
    return result;
  }
}
