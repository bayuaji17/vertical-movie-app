import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses, Uuid } from "../../shared/content-model";
import { t } from "elysia";
import { ContentPageDto, ContentPageQuery, ContentType } from "./model";
import { AdminCoverService } from "./cover-service";
import { ContentPageService } from "./service";

export function createContentModule({
  service = new ContentPageService(),
  covers = new AdminCoverService(),
  getSession,
}: {
  service?: ContentPageService;
  covers?: AdminCoverService;
  getSession: RequireAdminDependencies["getSession"];
}) {
  return new Elysia({ name: "api.content", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .get("/admin/content", ({ query }) => service.list(query), {
      requireAdmin: true,
      query: ContentPageQuery,
      response: { 200: ContentPageDto, ...ErrorResponses },
      detail: {
        tags: ["Content"],
        summary: "List numbered content pages",
        operationId: "listContentPage",
        security: [{ betterAuthSessionCookie: [] }],
      },
    })
    .get(
      "/admin/content/:type/:id/cover",
      ({ params, request, set }) => {
        // The guard marks admin responses no-store; thumbnails may be kept
        // briefly by the browser and are revalidated with their ETag.
        set.headers["cache-control"] = "private, max-age=300";
        return covers.get(
          params.type,
          params.id,
          request.headers.get("if-none-match"),
          request.signal,
        );
      },
      {
        requireAdmin: true,
        params: t.Object({ type: ContentType, id: Uuid }),
        detail: {
          tags: ["Content"],
          summary: "Small WebP thumbnail of an item's verified cover",
          operationId: "getAdminContentCover",
          security: [{ betterAuthSessionCookie: [] }],
          responses: {
            200: {
              description: "Bounded WebP thumbnail",
              content: {
                "image/webp": { schema: { type: "string", format: "binary" } },
              },
            },
            304: { description: "Not modified" },
          },
        },
      },
    );
}
