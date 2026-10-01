import { Elysia } from "elysia";
import { openapi, toOpenAPISchema } from "@elysia/openapi";
import type { AuthOpenAPISchema } from "@repo/auth/server";
import type { createDatabase } from "./db/client";
import { createAdminRoutes } from "./modules/auth/admin";
import type { RequireAdminDependencies } from "./modules/auth/admin/guard";
import { isDisabledAuthPath, supportedAuthOperations } from "./modules/auth";
import type { createAdminAuth } from "./modules/auth";
import {
  createAuthOpenApiFragment,
  mergeOpenApiResponse,
} from "./plugins/openapi";

type AppDependencies = {
  database?: Pick<ReturnType<typeof createDatabase>, "client">;
  auth?: Pick<ReturnType<typeof createAdminAuth>, "handler">;
  authOpenApiSchema?: AuthOpenAPISchema;
  secureCookies?: boolean;
  admin?: RequireAdminDependencies;
};

function createAuthRoutes(auth?: AppDependencies["auth"]) {
  return new Elysia({ name: "api.auth-routes" }).all(
    "/api/auth/*",
    ({ request }) => {
      if (!auth) return new Response("Not Found", { status: 404 });
      const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
      if (isDisabledAuthPath(path, request.method)) {
        return new Response("Not Found", { status: 404 });
      }
      return auth.handler(request);
    },
    {
      detail: { hide: true },
    },
  );
}

export function createApp({
  database,
  auth,
  authOpenApiSchema,
  secureCookies = false,
  admin,
}: AppDependencies = {}) {
  const app = new Elysia()
    .get("/", () => "Hello Elysia", {
      detail: {
        tags: ["System"],
        operationId: "getHealth",
        summary: "Check API availability",
      },
    })
    .use(createAuthRoutes(auth))
    .use(createAdminRoutes(admin));

  const applicationSchema = toOpenAPISchema(
    app,
    undefined,
    undefined,
    undefined,
    "3.1.1",
  );
  const authFragment = authOpenApiSchema
    ? createAuthOpenApiFragment(
        applicationSchema,
        authOpenApiSchema,
        secureCookies,
      )
    : undefined;

  const openApiPlugin = new Elysia({ name: "api.openapi" });
  if (authFragment) {
    // Keep schema rewriting inside the Scalar plugin, outside business routes.
    openApiPlugin.onAfterHandle(async ({ request, response }) => {
      if (new URL(request.url).pathname !== "/openapi/json") return;
      return mergeOpenApiResponse(response, authFragment);
    });
  }

  const documentedApp = app.use(
    openApiPlugin.use(
      openapi({
        provider: "scalar",
        openapiVersion: "3.1.1",
        documentation: {
          info: {
            title: "Vertical Movie API",
            description:
              "HTTP API for the Vertical Movie application and admin console.",
            version: "0.1.0",
          },
        },
      }),
    ),
  );

  return documentedApp.onStop(() => database?.client.close());
}
