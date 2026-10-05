import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses } from "../../shared/content-model";
import { MediaService } from "./service";
import {
  InitiateUploadBody,
  UploadParams,
  UploadPartBody,
  UploadDto,
  UploadPartDto,
  OwnerParams,
  OwnerMediaDto,
} from "./model";
const detail = (operationId: string, summary: string) => ({
  tags: ["Media"],
  operationId,
  summary,
  security: [{ betterAuthSessionCookie: [] }],
});
export function createMediaModule({
  service = new MediaService(),
  getSession,
}: RequireAdminDependencies & { service?: MediaService }) {
  return new Elysia({ name: "api.media", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .onBeforeHandle(({ set }) => {
      set.headers["cache-control"] = "private, no-store";
    })
    .get(
      "/admin/media/owners/:ownerType/:ownerId",
      ({ params, adminSession }) =>
        service.ownerMedia(params, adminSession.user.id),
      {
        requireAdmin: true,
        params: OwnerParams,
        response: { 200: OwnerMediaDto, ...ErrorResponses },
        detail: detail(
          "getOwnerMedia",
          "Read current assets and recover active upload sessions",
        ),
      },
    )
    .post(
      "/admin/media/uploads",
      ({ body, adminSession, status }) =>
        service
          .initiate(body, adminSession.user.id)
          .then((dto) => status(201, dto)),
      {
        requireAdmin: true,
        body: InitiateUploadBody,
        response: { 201: UploadDto, ...ErrorResponses },
        detail: detail(
          "initiateMediaUpload",
          "Initiate an idempotent multipart upload",
        ),
      },
    )
    .get(
      "/admin/media/uploads/:id",
      ({ params, adminSession }) =>
        service.status(params.id, adminSession.user.id),
      {
        requireAdmin: true,
        params: UploadParams,
        response: { 200: UploadDto, ...ErrorResponses },
        detail: detail(
          "getMediaUpload",
          "Reconcile uploaded parts and session status",
        ),
      },
    )
    .post(
      "/admin/media/uploads/:id/parts",
      ({ params, body, adminSession }) =>
        service.part(params.id, body.partNumber, adminSession.user.id),
      {
        requireAdmin: true,
        params: UploadParams,
        body: UploadPartBody,
        response: { 200: UploadPartDto, ...ErrorResponses },
        detail: detail(
          "signMediaUploadPart",
          "Authorize one unfinished upload part",
        ),
      },
    )
    .post(
      "/admin/media/uploads/:id/complete",
      ({ params, adminSession }) =>
        service.complete(params.id, adminSession.user.id),
      {
        requireAdmin: true,
        params: UploadParams,
        response: { 200: UploadDto, ...ErrorResponses },
        detail: detail(
          "completeMediaUpload",
          "Verify and freeze the uploaded source",
        ),
      },
    )
    .post(
      "/admin/media/uploads/:id/abort",
      ({ params, adminSession }) =>
        service.abort(params.id, adminSession.user.id),
      {
        requireAdmin: true,
        params: UploadParams,
        response: { 200: UploadDto, ...ErrorResponses },
        detail: detail("abortMediaUpload", "Abort a multipart upload"),
      },
    );
}
