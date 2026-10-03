import { Elysia } from "elysia";
import { projectSession } from "@repo/auth/server";
import type { SessionInput } from "@repo/auth/types";

export type AdminSession = SessionInput;

export type RequireAdminDependencies = {
  getSession: (input: {
    headers: Headers;
    query: { disableCookieCache: true };
  }) => Promise<AdminSession | null>;
};

function authError(code: string, message: string) {
  return {
    error: {
      code,
      message,
      requestId: crypto.randomUUID(),
    },
  };
}

export function createRequireAdmin({ getSession }: RequireAdminDependencies) {
  return new Elysia({ name: "api.require-admin" }).macro({
    requireAdmin: {
      async resolve({ request, set, status }) {
        set.headers["cache-control"] = "private, no-store";
        try {
          const session = await getSession({
            headers: request.headers,
            query: { disableCookieCache: true },
          });
          const snapshot = projectSession(session);
          if (
            !snapshot ||
            Date.parse(snapshot.session.expiresAt) <= Date.now()
          ) {
            return status(
              401,
              authError("AUTH_REQUIRED", "A valid admin session is required."),
            );
          }
          if (snapshot.user.role !== "admin" || snapshot.user.banned) {
            return status(
              403,
              authError(
                "ADMIN_FORBIDDEN",
                "This account is not authorized to access the admin console.",
              ),
            );
          }

          return { adminSession: snapshot };
        } catch {
          return status(
            503,
            authError(
              "AUTH_DEPENDENCY_UNAVAILABLE",
              "Admin authorization is temporarily unavailable.",
            ),
          );
        }
      },
    },
  });
}
