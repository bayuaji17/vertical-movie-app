import { Elysia } from "elysia";
import type { createDatabase } from "./db/client";

type AppDependencies = {
  database?: Pick<ReturnType<typeof createDatabase>, "client">;
};

export function createApp({ database }: AppDependencies = {}) {
  const app = new Elysia().get("/", () => "Hello Elysia");

  if (database) app.onStop(() => database.client.close());

  return app;
}
