import { ArchiveBody } from "../../shared/content-model";
import { PatchVideoBody } from "./model";
import { IdParams } from "../../shared/content-model";
import { VideoListQuery, VideoListDto, VideoDetailDto } from "./model";
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
    )
    .get("/admin/videos", ({ query }) => service.list(query), {
      requireAdmin: true,
      query: VideoListQuery,
      response: { 200: VideoListDto, ...ErrorResponses },
      detail: {
        tags: ["Videos"],
        summary: "List video metadata",
        operationId: "listVideos",
        security: [{ betterAuthSessionCookie: [] }],
      },
    })
    .get("/admin/videos/:id", ({ params }) => service.get(params.id), {
      requireAdmin: true,
      params: IdParams,
      response: { 200: VideoDetailDto, ...ErrorResponses },
      detail: {
        tags: ["Videos"],
        summary: "Read video metadata and grouping",
        operationId: "getVideo",
        security: [{ betterAuthSessionCookie: [] }],
      },
    })
    .patch(
      "/admin/videos/:id",
      ({ params, body, adminSession }) =>
        service.update(params.id, body, adminSession.user.id),
      {
        requireAdmin: true,
        params: IdParams,
        body: PatchVideoBody,
        response: { 200: VideoDto, ...ErrorResponses },
        detail: {
          tags: ["Videos"],
          summary: "Edit video metadata with expectedVersion",
          operationId: "updateVideo",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .post(
      "/admin/videos/:id/archive",
      ({ params, body, adminSession }) =>
        service.archive(params.id, body.expectedVersion, adminSession.user.id),
      {
        requireAdmin: true,
        params: IdParams,
        body: ArchiveBody,
        response: { 200: VideoDto, ...ErrorResponses },
        detail: {
          tags: ["Videos"],
          summary: "Archive draft or published video",
          operationId: "archiveVideo",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    );
}
