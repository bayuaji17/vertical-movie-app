import { SQL } from "bun";
import { createDatabase } from "../../src/db/client";
import { applyDatabaseMigrations } from "../../src/db/migrate";
export function mediaTestUrl(value = Bun.env.MEDIA_TEST_DATABASE_URL) {
  if (!value) throw new Error("MEDIA_TEST_DATABASE_URL is required.");
  const u = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(u.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
    u.pathname !== "/vertical_movie_app_media_test"
  )
    throw new Error("Refusing non-dedicated media database.");
  return value;
}
export async function resetMediaDatabase() {
  const url = mediaTestUrl(),
    client = new SQL(url);
  try {
    await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await client.unsafe("CREATE SCHEMA public");
    await client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  } finally {
    await client.close();
  }
  await applyDatabaseMigrations(url);
  const database = createDatabase(url);
  await database.client`INSERT INTO "user" (id,name,email,role,created_at,updated_at) VALUES ('media-admin','Admin','media-admin@example.test','admin',now(),now())`;
  return database;
}
