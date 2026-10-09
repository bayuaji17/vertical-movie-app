import { Elysia, t } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses } from "../../shared/content-model";
import { DashboardService } from "./service";
import { DashboardSummaryDto } from "./model";
export function createDashboardModule({
  service = new DashboardService(),
  getSession,
}: RequireAdminDependencies & { service?: DashboardService }) {
  return new Elysia({ name: "api.dashboard", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .onBeforeHandle(({ set }) => {
      set.headers["cache-control"] = "private, no-store";
    })
    .get("/admin/dashboard/summary", () => service.summary(), {
      requireAdmin: true,
      query: t.Object({}, { additionalProperties: false }),
      response: { 200: DashboardSummaryDto, ...ErrorResponses },
      detail: {
        tags: ["Dashboard"],
        operationId: "getAdminDashboardSummary",
        summary:
          "Read one snapshot of editorial inventory and current media jobs",
        security: [{ betterAuthSessionCookie: [] }],
      },
    });
}
