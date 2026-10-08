import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import { IdParams, ErrorResponses } from "../../shared/content-model";
import { PublicationService } from "./service";
import {
  PublishBody,
  PublicationDto,
  PublicationReadinessDto,
  SeriesPublicationReadinessDto,
} from "./model";
export function createPublicationModule({
  service = new PublicationService(),
  getSession,
}: RequireAdminDependencies & { service?: PublicationService }) {
  return new Elysia({ name: "api.publication", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .onBeforeHandle(({ set }) => {
      set.headers["cache-control"] = "private, no-store";
    })
    .get(
      "/admin/videos/:id/publication-readiness",
      ({ params }) => service.readiness(params.id),
      {
        requireAdmin: true,
        params: IdParams,
        response: { 200: PublicationReadinessDto, ...ErrorResponses },
        detail: {
          tags: ["Publication"],
          operationId: "videoPublicationReadiness",
          summary: "Assess video publication readiness without side effects",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .get(
      "/admin/series/:id/publication-readiness",
      ({ params }) => service.seriesReadiness(params.id),
      {
        requireAdmin: true,
        params: IdParams,
        response: { 200: SeriesPublicationReadinessDto, ...ErrorResponses },
        detail: {
          tags: ["Publication"],
          operationId: "seriesPublicationReadiness",
          summary: "Assess series publication readiness without side effects",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .post(
      "/admin/videos/:id/publish",
      ({ params, body, adminSession }) =>
        service.publish("video", params.id, body, adminSession.user.id),
      {
        requireAdmin: true,
        params: IdParams,
        body: PublishBody,
        response: { 200: PublicationDto, ...ErrorResponses },
        detail: {
          tags: ["Publication"],
          operationId: "publishVideo",
          summary: "Publish a ready draft video manually",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .post(
      "/admin/series/:id/publish",
      ({ params, body, adminSession }) =>
        service.publish("series", params.id, body, adminSession.user.id),
      {
        requireAdmin: true,
        params: IdParams,
        body: PublishBody,
        response: { 200: PublicationDto, ...ErrorResponses },
        detail: {
          tags: ["Publication"],
          operationId: "publishSeries",
          summary: "Publish a series with a ready episode",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    );
}
