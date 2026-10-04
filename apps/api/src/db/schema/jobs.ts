import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  unique,
  index,
  check,
  type AnyPgColumn,
  type PgTableExtraConfigValue,
} from "drizzle-orm/pg-core";
import { mediaAssets } from "./media";
export const mediaJobs = pgTable(
  "media_jobs",
  {
    id: uuid("id").primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references((): AnyPgColumn => mediaAssets.id, { onDelete: "restrict" }),
    generation: integer("generation").notNull(),
    kind: text("kind").$type<"source" | "poster">().notNull(),
    state: text("state")
      .$type<
        "queued" | "running" | "retry" | "succeeded" | "failed" | "cancelled"
      >()
      .notNull()
      .default("queued"),
    attempts: integer("attempts").notNull().default(0),
    failures: integer("failures").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    progressSeconds: integer("progress_seconds").notNull().default(0),
    failureCode: text("failure_code"),
    outputPrefix: text("output_prefix"),
    outputFiles: jsonb("output_files").$type<string[]>(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    unique("media_jobs_generation_unique").on(t.assetId, t.generation),
    unique("media_jobs_asset_unique").on(t.id, t.assetId),
    check(
      "media_jobs_state_check",
      sql`${t.state} IN ('queued','running','retry','succeeded','failed','cancelled')`,
    ),
    check("media_jobs_kind_check", sql`${t.kind} IN ('source','poster')`),
    check(
      "media_jobs_attempt_check",
      sql`${t.attempts}>=0 AND ${t.failures}>=0 AND ${t.failures}<=${t.attempts} AND ${t.generation}>0 AND ${t.progressSeconds}>=0`,
    ),
    check(
      "media_jobs_lease_check",
      sql`(${t.state}='running')=(${t.leaseToken} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL) AND (${t.leaseToken} IS NULL)=(${t.leaseUntil} IS NULL)`,
    ),
    check(
      "media_jobs_ready_check",
      sql`${t.state}<>'succeeded' OR (${t.outputPrefix} IS NOT NULL AND ${t.outputFiles} IS NOT NULL AND ${t.finishedAt} IS NOT NULL)`,
    ),
    index("media_jobs_poll_idx")
      .on(t.runAfter, t.id)
      .where(sql`${t.state} IN ('queued','retry')`),
    index("media_jobs_lease_idx")
      .on(t.leaseUntil)
      .where(sql`${t.state}='running'`),
  ],
);
export const mediaRenditions = pgTable(
  "media_renditions",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => mediaJobs.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bitrate: integer("bitrate").notNull(),
    playlistKey: text("playlist_key").notNull(),
  },
  (t) => [
    unique("media_renditions_job_name_unique").on(t.jobId, t.name),
    check(
      "media_renditions_dimensions_check",
      sql`${t.width}>0 AND ${t.height}>${t.width} AND ${t.width}<=1080 AND ${t.height}<=1920 AND ${t.bitrate}>0`,
    ),
  ],
);

export const mediaJobAttempts = pgTable(
  "media_job_attempts",
  {
    token: uuid("token").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => mediaJobs.id, { onDelete: "restrict" }),
    attempt: integer("attempt").notNull(),
    outputPrefix: text("output_prefix").notNull().unique(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
    cleanedAt: timestamp("cleaned_at", { withTimezone: true }),
    failureCode: text("failure_code"),
  },
  (t) => [
    unique("media_job_attempts_number_unique").on(t.jobId, t.attempt),
    check("media_job_attempts_attempt_check", sql`${t.attempt}>0`),
    index("media_job_attempts_cleanup_idx")
      .on(t.stoppedAt)
      .where(sql`${t.cleanedAt} IS NULL`),
  ],
);
