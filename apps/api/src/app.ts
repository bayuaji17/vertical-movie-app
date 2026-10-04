import { createCatalogModule } from "./modules/catalog";
import { createPublicationModule } from "./modules/publication";
import { createPlaybackModule } from "./modules/playback";
import type { CatalogService } from "./modules/catalog/service";
import type { PublicationService } from "./modules/publication/service";
import type { PlaybackService } from "./modules/playback/service";
import { createMediaModule } from "./modules/media";
import type { MediaService } from "./modules/media/service";
import { Elysia } from "elysia";
import { openapi, toOpenAPISchema } from "@elysia/openapi";
import type { AuthOpenAPISchema } from "@repo/auth/server";
import type { createDatabase } from "./db/client";
import { isDisabledAuthPath } from "@repo/auth/server";
import type { AuthServer } from "@repo/auth/server";
import {
  createAuthOpenApiFragment,
  mergeOpenApiResponse,
} from "./plugins/openapi";
import { createSeriesModule } from "./modules/series";
import { createVideosModule } from "./modules/videos";
import { createGenresModule } from "./modules/genres";
import type { SeriesService } from "./modules/series/service";
import type { VideosService } from "./modules/videos/service";
import type { GenresService } from "./modules/genres/service";
import type { RequireAdminDependencies } from "./modules/auth/admin/guard";

import type { S3Client } from "bun";

type AppDependencies = {
  storage?: S3Client;
  mediaService?: MediaService;
  catalogService?: CatalogService;
  publicationService?: PublicationService;
  playbackService?: PlaybackService;
  database?: Pick<ReturnType<typeof createDatabase>, "client">;
  auth?: Pick<AuthServer, "handler">;
  authOpenApiSchema?: AuthOpenAPISchema;
  secureCookies?: boolean;
  getSession?: RequireAdminDependencies["getSession"];
  seriesService?: SeriesService;
  videosService?: VideosService;
  genresService?: GenresService;
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
  storage,
  mediaService,
  catalogService,
  publicationService,
  playbackService,
  database,
  auth,
  authOpenApiSchema,
  secureCookies = false,
  getSession = async () => {
    throw new Error("Authorization service unavailable");
  },
  seriesService,
  videosService,
  genresService,
}: AppDependencies = {}) {
  const app = new Elysia({ normalize: false })
    .decorate("storage", storage)
    .get("/", () => "Hello Elysia", {
      detail: {
        tags: ["System"],
        operationId: "getHealth",
        summary: "Check API availability",
      },
    })
    .use(createAuthRoutes(auth))
    .use(createSeriesModule({ service: seriesService, getSession }))
    .use(createVideosModule({ service: videosService, getSession }))
    .use(createGenresModule({ service: genresService, getSession }))
    .use(createMediaModule({ service: mediaService, getSession }))
    .use(createCatalogModule(catalogService))
    .use(createPublicationModule({ service: publicationService, getSession }))
    .use(createPlaybackModule({ service: playbackService, getSession }));

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
        exclude: { staticFile: false },
        openapiVersion: "3.1.1",
        documentation: {
          ...(!authFragment
            ? {
                components: {
                  securitySchemes: {
                    betterAuthSessionCookie: {
                      type: "apiKey" as const,
                      in: "cookie" as const,
                      name: secureCookies
                        ? "__Secure-better-auth.session_token"
                        : "better-auth.session_token",
                    },
                  },
                },
              }
            : {}),
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
