import { mediaJobs } from "./jobs";
import { foreignKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  timestamp,
  jsonb,
  unique,
  check,
  index,
  type AnyPgColumn,
  type PgTableExtraConfigValue,
} from "drizzle-orm/pg-core";
import { videos } from "./videos";
import { series } from "./series";
import { user } from "./auth";
export type AssetKind = "source" | "poster";
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey(),
    readyJobId: uuid("ready_job_id"),
    videoId: uuid("video_id").references((): AnyPgColumn => videos.id, {
      onDelete: "restrict",
    }),
    seriesId: uuid("series_id").references((): AnyPgColumn => series.id, {
      onDelete: "restrict",
    }),
    kind: text("kind").$type<AssetKind>().notNull(),
    provider: text("provider").$type<"minio" | "r2">().notNull(),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    state: text("state")
      .$type<"uploading" | "uploaded" | "processing" | "ready" | "failed">()
      .notNull()
      .default("uploading"),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    contentType: text("content_type").notNull(),
    etag: text("etag"),
    sha256: text("sha256"),
    facts: jsonb("facts").$type<Record<string, unknown>>(),
    generation: integer("generation").notNull().default(1),
    verifiedReadyAt: timestamp("verified_ready_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    deletionToken: uuid("deletion_token"),
    deletionClaimedAt: timestamp("deletion_claimed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    foreignKey({
      name: "media_assets_ready_job_owner_fk",
      columns: [t.readyJobId, t.id],
      foreignColumns: [mediaJobs.id, mediaJobs.assetId],
    }),
    unique("media_assets_video_owner_unique").on(t.id, t.videoId),
    unique("media_assets_series_owner_unique").on(t.id, t.seriesId),
    unique("media_assets_kind_unique").on(t.id, t.kind),
    unique("media_assets_object_unique").on(t.provider, t.bucket, t.objectKey),
    check(
      "media_assets_owner_check",
      sql`num_nonnulls(${t.videoId},${t.seriesId}) = 1 AND (${t.seriesId} IS NULL OR ${t.kind} = 'poster')`,
    ),
    check("media_assets_kind_check", sql`${t.kind} IN ('source','poster')`),
    check("media_assets_provider_check", sql`${t.provider} IN ('minio','r2')`),
    check(
      "media_assets_state_check",
      sql`${t.state} IN ('uploading','uploaded','processing','ready','failed')`,
    ),
    check(
      "media_assets_size_check",
      sql`${t.sizeBytes} > 0 AND ${t.generation} > 0`,
    ),
    check(
      "media_assets_sha256_check",
      sql`${t.sha256} IS NULL OR ${t.sha256} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "media_assets_deletion_check",
      sql`(${t.deletionToken} IS NULL) = (${t.deletionClaimedAt} IS NULL)`,
    ),
    index("media_assets_retention_idx")
      .on(t.verifiedReadyAt)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);
