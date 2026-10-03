import { SQL } from "bun";
import { createDatabase } from "../../src/db/client";
import { applyDatabaseMigrations } from "../../src/db/migrate";

export function contentTestUrl(value = Bun.env.CONTENT_TEST_DATABASE_URL) {
  if (!value)
    throw new Error(
      "CONTENT_TEST_DATABASE_URL required for dedicated content proof.",
    );
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid content test database URL.");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    parsed.pathname !== "/vertical_movie_app_content_test"
  )
    throw new Error("Refusing non-dedicated local content database.");
  return value;
}
export async function resetContentDatabase() {
  const url = contentTestUrl();
  const client = new SQL(url);
  try {
    await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await client.unsafe("CREATE SCHEMA public");
    await client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  } finally {
    await client.close();
  }
  await applyDatabaseMigrations(url);
  const database = createDatabase(url);
  await database.client`INSERT INTO "user" (id,name,email,role,created_at,updated_at) VALUES ('content-admin','Admin','content-admin@example.test','admin',now(),now())`;
  return database;
}
