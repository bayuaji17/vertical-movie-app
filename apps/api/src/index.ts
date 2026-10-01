import { loadApiEnv } from "./config/env";
import { createApp } from "./app";
import { createDatabase } from "./db/client";
import { createAdminAuth, createAdminPolicy } from "./modules/auth";
import { generateAuthOpenAPISchema } from "@repo/auth/server";

const env = loadApiEnv();
const database = createDatabase(env.databaseUrl);
const auth = createAdminAuth({
  database: database.db,
  origin: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  secureCookies: env.betterAuthUrl.startsWith("https://"),
  isAdminUser: createAdminPolicy(database.db),
});
const authOpenApiSchema = await generateAuthOpenAPISchema(auth);
const app = createApp({
  database,
  auth,
  authOpenApiSchema,
  secureCookies: env.betterAuthUrl.startsWith("https://"),
  admin: {
    getSession: (headers) => auth.api.getSession({ headers }),
    isAdminUser: createAdminPolicy(database.db),
  },
}).listen(env.port);

let isShuttingDown = false;
const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  void app.stop().catch(() => {
    console.error("API shutdown did not complete cleanly.");
    process.exitCode = 1;
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
