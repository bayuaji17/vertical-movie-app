import { Elysia } from "elysia";

export type AdminSession = {
  user: { id: string; name: string; email: string };
  session: { expiresAt: Date };
};

export type RequireAdminDependencies = {
  getSession: (headers: Headers) => Promise<AdminSession | null>;
  isAdminUser: (userId: string) => Promise<boolean>;
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

export function createRequireAdmin({
  getSession,
  isAdminUser,
}: RequireAdminDependencies) {
  return new Elysia({ name: "api.require-admin" }).macro({
    requireAdmin: {
      async resolve({ request, set, status }) {
        set.headers["cache-control"] = "no-store";
        try {
          const session = await getSession(request.headers);
          if (!session) {
            return status(
              401,
              authError("AUTH_REQUIRED", "A valid admin session is required."),
            );
          }
          if (!(await isAdminUser(session.user.id))) {
            return status(
              403,
              authError(
                "ADMIN_FORBIDDEN",
                "This account is not authorized to access the admin console.",
              ),
            );
          }

          return { adminSession: session };
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
