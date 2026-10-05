import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses } from "../../shared/content-model";
import { ContentPageDto, ContentPageQuery } from "./model";
import { ContentPageService } from "./service";

export function createContentModule({
  service = new ContentPageService(),
  getSession,
}: {
  service?: ContentPageService;
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
    });
}
