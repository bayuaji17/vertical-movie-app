import { Elysia } from "elysia";
import type { createDatabase } from "./db/client";
import { createAdminRoutes } from "./modules/auth/admin";
import type { RequireAdminDependencies } from "./modules/auth/admin/guard";
import { isDisabledAuthPath } from "./modules/auth";
import type { createAdminAuth } from "./modules/auth";

type AppDependencies = {
  database?: Pick<ReturnType<typeof createDatabase>, "client">;
  auth?: Pick<ReturnType<typeof createAdminAuth>, "handler">;
  admin?: RequireAdminDependencies;
};

function createAuthRoutes(auth?: AppDependencies["auth"]) {
  return new Elysia({ name: "api.auth-routes" }).all(
    "/api/auth/*",
    ({ request }) => {
      if (!auth) return new Response("Not Found", { status: 404 });
      const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
      if (isDisabledAuthPath(path)) {
        return new Response("Not Found", { status: 404 });
      }
      return auth.handler(request);
    },
  );
}

export function createApp({ database, auth, admin }: AppDependencies = {}) {
  return new Elysia()
    .get("/", () => "Hello Elysia")
    .use(createAuthRoutes(auth))
    .use(createAdminRoutes(admin))
    .onStop(() => database?.client.close());
}
