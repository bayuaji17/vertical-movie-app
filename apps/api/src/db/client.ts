import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

export function createDatabase(connectionString: string) {
  const client = new SQL(connectionString);
  const db = drizzle({ client });

  return { client, db } as const;
}
