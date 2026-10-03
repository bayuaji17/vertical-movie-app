import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import {
  ErrorResponses,
  IdParams,
  ListQuery,
} from "../../shared/content-model";
import {
  CreateSeriesBody,
  PatchSeriesBody,
  SeriesDto,
  SeriesDetailDto,
  SeriesListDto,
  CreateSeriesResponse,
} from "./model";
import { SeriesService } from "./service";
export function createSeriesModule({
  service = new SeriesService(),
  getSession,
}: RequireAdminDependencies & { service?: SeriesService }) {
  return new Elysia({ name: "api.series", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .post(
      "/admin/series",
      ({ body, adminSession, status }) =>
        service
          .create(body, adminSession.user.id)
          .then((dto) => status(201, dto)),
      {
        requireAdmin: true,
        body: CreateSeriesBody,
        response: { 201: CreateSeriesResponse, ...ErrorResponses },
        detail: {
          tags: ["Series"],
          summary: "Create draft series with Season 1",
          operationId: "createSeries",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .get("/admin/series", ({ query }) => service.list(query), {
      requireAdmin: true,
      query: ListQuery,
      response: { 200: SeriesListDto, ...ErrorResponses },
      detail: {
        tags: ["Series"],
        summary: "List series",
        operationId: "listSeries",
        security: [{ betterAuthSessionCookie: [] }],
      },
    })
    .get("/admin/series/:id", ({ params }) => service.get(params.id), {
      requireAdmin: true,
      params: IdParams,
      response: { 200: SeriesDetailDto, ...ErrorResponses },
      detail: {
        tags: ["Series"],
        summary: "Read series metadata",
        operationId: "getSeries",
        security: [{ betterAuthSessionCookie: [] }],
      },
    })
    .patch(
      "/admin/series/:id",
      ({ params, body, adminSession }) =>
        service.update(params.id, body, adminSession.user.id),
      {
        requireAdmin: true,
        params: IdParams,
        body: PatchSeriesBody,
        response: { 200: SeriesDto, ...ErrorResponses },
        detail: {
          tags: ["Series"],
          summary: "Edit series metadata with expectedVersion",
          operationId: "updateSeries",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    );
}
