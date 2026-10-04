import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { videos } from "./videos";
import { series } from "./series";
import { user } from "./auth";
export const contentOperations = pgTable(
  "content_operations",
  {
    id: uuid("id").primaryKey(),
    videoId: uuid("video_id").references(() => videos.id, {
      onDelete: "restrict",
    }),
    seriesId: uuid("series_id").references(() => series.id, {
      onDelete: "restrict",
    }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    action: text("action").$type<"publish" | "archive">().notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("content_operations_idempotency_unique").on(
      t.actorId,
      t.idempotencyKey,
    ),
    check(
      "content_operations_owner_check",
      sql`num_nonnulls(${t.videoId},${t.seriesId})=1`,
    ),
    check(
      "content_operations_action_check",
      sql`${t.action} IN ('publish','archive')`,
    ),
    check(
      "content_operations_hash_check",
      sql`${t.requestHash} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);
