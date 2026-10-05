import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  timestamp,
  unique,
  uniqueIndex,
  index,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { mediaAssets } from "./media";
import { user } from "./auth";
export const uploadSessions = pgTable(
  "upload_sessions",
  {
    id: uuid("id").primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    videoId: uuid("video_id"),
    seriesId: uuid("series_id"),
    kind: text("kind").$type<"source" | "poster">().notNull(),
    processingMode: text("processing_mode")
      .$type<"worker" | "request">()
      .notNull()
      .default("worker"),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    expectedSha256: text("expected_sha256"),
    filename: text("filename").notNull(),
    stagingKey: text("staging_key").notNull().unique(),
    uploadId: text("upload_id"),
    status: text("status")
      .$type<
        | "initializing"
        | "pending"
        | "completing"
        | "completed"
        | "aborting"
        | "aborted"
        | "expired"
        | "failed"
      >()
      .notNull(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    partSizeBytes: bigint("part_size_bytes", { mode: "bigint" }).notNull(),
    partCount: integer("part_count").notNull(),
    claimToken: uuid("claim_token"),
    claimUntil: timestamp("claim_until", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    cleanedAt: timestamp("cleaned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("upload_sessions_idempotency_unique").on(
      t.actorId,
      t.idempotencyKey,
    ),
    foreignKey({
      name: "upload_sessions_video_owner_fk",
      columns: [t.assetId, t.videoId],
      foreignColumns: [mediaAssets.id, mediaAssets.videoId],
    }),
    foreignKey({
      name: "upload_sessions_series_owner_fk",
      columns: [t.assetId, t.seriesId],
      foreignColumns: [mediaAssets.id, mediaAssets.seriesId],
    }),
    foreignKey({
      name: "upload_sessions_kind_fk",
      columns: [t.assetId, t.kind],
      foreignColumns: [mediaAssets.id, mediaAssets.kind],
    }),
    check(
      "upload_sessions_owner_check",
      sql`num_nonnulls(${t.videoId},${t.seriesId})=1`,
    ),
    check(
      "upload_sessions_processing_mode_check",
      sql`${t.processingMode} IN ('worker','request') AND (${t.processingMode}='worker' OR ${t.kind}='poster')`,
    ),
    check(
      "upload_sessions_state_check",
      sql`${t.status} IN ('initializing','pending','completing','completed','aborting','aborted','expired','failed')`,
    ),
    check(
      "upload_sessions_geometry_check",
      sql`${t.sizeBytes}>0 AND ${t.partSizeBytes}>=5242880 AND ${t.partCount}=ceil(${t.sizeBytes}::numeric/${t.partSizeBytes}) AND ${t.partCount} BETWEEN 1 AND 10000`,
    ),
    check(
      "upload_sessions_hash_check",
      sql`${t.requestHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "upload_sessions_expected_sha256_check",
      sql`${t.expectedSha256} IS NULL OR ${t.expectedSha256} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "upload_sessions_claim_check",
      sql`(${t.claimToken} IS NULL)=(${t.claimUntil} IS NULL)`,
    ),
    check("upload_sessions_expiry_check", sql`${t.expiresAt}>${t.createdAt}`),
    check(
      "upload_sessions_completion_check",
      sql`(${t.status}='completed')=(${t.completedAt} IS NOT NULL) AND (${t.status} NOT IN ('pending','completing','completed') OR ${t.uploadId} IS NOT NULL)`,
    ),
    uniqueIndex("upload_sessions_pending_owner_unique")
      .on(
        sql`coalesce(${t.videoId},${t.seriesId})`,
        sql`(CASE WHEN ${t.videoId} IS NULL THEN 'series' ELSE 'video' END)`,
        t.kind,
      )
      .where(
        sql`${t.status} IN ('initializing','pending','completing','aborting')`,
      ),
    index("upload_sessions_expiry_idx")
      .on(t.expiresAt)
      .where(sql`${t.cleanedAt} IS NULL`),
  ],
);
