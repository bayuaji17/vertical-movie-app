import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses } from "../../shared/content-model";
import { CreateVideoBody, VideoDto } from "./model";
import { VideosService } from "./service";
export function createVideosModule({
  service = new VideosService(),
  getSession,
}: RequireAdminDependencies & { service?: VideosService }) {
  return new Elysia({ name: "api.videos", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .post(
      "/admin/videos",
      ({ body, adminSession, status }) =>
        service
          .create(body, adminSession.user.id)
          .then((dto) => status(201, dto)),
      {
        requireAdmin: true,
        body: CreateVideoBody,
        response: { 201: VideoDto, ...ErrorResponses },
        detail: {
          tags: ["Videos"],
          summary: "Create a draft episode movie or standalone video",
          operationId: "createVideo",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    );
}
