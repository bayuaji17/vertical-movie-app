import { createAdminAuthServer } from "@repo/auth/server";
import { loadApiEnv } from "./config/env";
import { createDatabase } from "./db/client";

// Operator composition entry for the official CLI. No HTTP server is started.
const env = loadApiEnv();
const { db } = createDatabase(env.databaseUrl);
export const auth = createAdminAuthServer({
  database: db,
  origin: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  secureCookies: env.betterAuthUrl.startsWith("https:"),
});
