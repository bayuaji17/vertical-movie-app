import { fileURLToPath } from "node:url";
import { createAdminAuthServer } from "../server";

/** Resolve the pinned workspace CLI, without downloading a different version. */
export function resolveAuthCliPath() {
  return fileURLToPath(new URL("./index.mjs", import.meta.resolve("auth/api")));
}

/** Trusted local operator only; this instance must never receive public requests. */
export function createAdminRecovery(
  config: Parameters<typeof createAdminAuthServer>[0],
) {
  let token: string | undefined;
  let busy = false;
  const auth = createAdminAuthServer({
    ...config,
    onRecoveryToken: async (input) => {
      token = input.token;
    },
  });
  return {
    auth,
    async reset(input: {
      email: string;
      password: string;
      maintenanceConfirmed: boolean;
    }) {
      if (!input.maintenanceConfirmed || busy)
        throw new Error("Recovery requires exclusive maintenance.");
      busy = true;
      try {
        const context = await auth.$context;
        const identity = await context.internalAdapter.findUserByEmail(
          input.email.trim().toLowerCase(),
        );
        if (
          !identity ||
          !("role" in identity.user) ||
          identity.user.role !== "admin"
        )
          throw new Error("Provision the admin first.");
        await auth.api.requestPasswordReset({
          body: { email: identity.user.email },
        });
        if (!token) throw new Error("Recovery token unavailable.");
        await auth.api.resetPassword({
          body: { token, newPassword: input.password },
        });
        // Do not report success if native revocation was incomplete.
        if (
          (await context.internalAdapter.listSessions(identity.user.id))
            .length > 0
        ) {
          throw new Error(
            "Session revocation incomplete; keep maintenance active.",
          );
        }
      } finally {
        token = undefined;
        input.password = "";
        busy = false;
      }
    },
  };
}
