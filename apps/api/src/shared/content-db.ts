import { inArray } from "drizzle-orm";
import type { createDatabase } from "../db/client";
import { genres } from "../db/schema/genres";
import { invalid } from "./content-error";
export type ContentDatabase = ReturnType<typeof createDatabase>["db"];
export type ContentConnection = Pick<
  ContentDatabase,
  "select" | "insert" | "update" | "delete"
>;
export async function assertGenreIds(db: ContentConnection, ids: string[]) {
  if (ids.length > 100 || new Set(ids).size !== ids.length)
    invalid("Genre IDs must be a unique list of at most 100.");
  if (!ids.length) return;
  const found = await db
    .select({ id: genres.id })
    .from(genres)
    .where(inArray(genres.id, ids));
  if (found.length !== ids.length) invalid("One or more genres do not exist.");
}
