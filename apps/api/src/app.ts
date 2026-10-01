import { Elysia } from "elysia";
import type { createDatabase } from "./db/client";
import { isDisabledAuthPath } from "./modules/auth";
import type { createAdminAuth } from "./modules/auth";

type AppDependencies = {
  database?: Pick<ReturnType<typeof createDatabase>, "client">;
  auth?: Pick<ReturnType<typeof createAdminAuth>, "handler">;
};

export function createApp({ database, auth }: AppDependencies = {}) {
  const app = new Elysia().get("/", () => "Hello Elysia");

  if (auth) {
    app.all("/api/auth/*", ({ request }) => {
      const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
      if (isDisabledAuthPath(path)) {
        return new Response("Not Found", { status: 404 });
      }
      return auth.handler(request);
    });
  }

  if (database) app.onStop(() => database.client.close());

  return app;
}
