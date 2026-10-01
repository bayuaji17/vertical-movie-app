import { sql } from "drizzle-orm";
import { check, pgTable, text } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const adminIdentity = pgTable(
  "admin_identity",
  {
    id: text("id").primaryKey().default("primary"),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("admin_identity_singleton_key_check", sql`${table.id} = 'primary'`),
  ],
);
