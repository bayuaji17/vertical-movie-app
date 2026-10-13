import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  unique,
  check,
  index,
} from "drizzle-orm/pg-core";

// Storage objects left behind by deleted content. Rows are written in the same
// transaction as the deletion; the worker removes the objects outside any
// transaction and retries until they are gone.
export const mediaStorageTombstones = pgTable(
  "media_storage_tombstones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").$type<"minio" | "r2">().notNull(),
    bucket: text("bucket").notNull(),
    kind: text("kind").$type<"object" | "prefix">().notNull(),
    key: text("key").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique("media_storage_tombstones_key_unique").on(
      t.provider,
      t.bucket,
      t.kind,
      t.key,
    ),
    check(
      "media_storage_tombstones_kind_check",
      sql`${t.kind} IN ('object','prefix')`,
    ),
    check(
      "media_storage_tombstones_key_check",
      sql`length(${t.key}) BETWEEN 1 AND 1024 AND (${t.kind} = 'object' OR ${t.key} LIKE '%/')`,
    ),
    index("media_storage_tombstones_pending_idx")
      .on(t.createdAt)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);
