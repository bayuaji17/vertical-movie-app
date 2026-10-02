import { Elysia } from "elysia";

import { createRequireAdmin } from "./guard";
import { AdminAuthErrorResponse, AdminSessionResponse } from "./model";
import type { RequireAdminDependencies } from "./guard";

const anonymousAdmin: RequireAdminDependencies = {
  getSession: async () => null,
};

export function createAdminRoutes(
  dependencies: RequireAdminDependencies = anonymousAdmin,
) {
  return new Elysia({ name: "api.admin-routes" })
    .use(createRequireAdmin(dependencies))
    .get(
      "/admin/session",
      ({ adminSession }) => ({
        user: {
          id: adminSession.user.id,
          name: adminSession.user.name,
          email: adminSession.user.email,
        },
        session: {
          expiresAt: new Date(adminSession.session.expiresAt).toISOString(),
        },
      }),
      {
        requireAdmin: true,
        response: {
          200: AdminSessionResponse,
          401: AdminAuthErrorResponse,
          403: AdminAuthErrorResponse,
          503: AdminAuthErrorResponse,
        },
        detail: {
          tags: ["Admin"],
          operationId: "getAdminSession",
          summary: "Get the current admin session",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    );
}
