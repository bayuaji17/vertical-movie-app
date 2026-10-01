import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

export function createDatabase(connectionString: string) {
  const client = new SQL(connectionString);
  const db = drizzle({ client, schema });

  return { client, db } as const;
}
