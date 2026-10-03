import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthOptions } from "./internal/options";
import type { AuthConfiguration } from "./internal/options";
import * as authSchema from "./internal/schema";

export { authSchema };
export { readServerSession } from "./internal/server-session";
export * from "./internal/schema";
export {
  passwordPolicy,
  supportedAuthOperations,
  disabledAuthPaths,
  isDisabledAuthPath,
} from "./internal/policy";
export {
  projectSession,
  isAdminSession,
  AuthDependencyError,
} from "./internal/projection";

export function createAdminAuthServer(
  config: AuthConfiguration & {
    database: Parameters<typeof drizzleAdapter>[0];
  },
) {
  return betterAuth({
    ...createAuthOptions(config),
    database: drizzleAdapter(config.database, {
      provider: "pg",
      schema: authSchema,
      transaction: true,
    }),
  });
}
export type AuthServer = ReturnType<typeof createAdminAuthServer>;

export type AuthOpenAPISchema = Awaited<
  ReturnType<ReturnType<typeof openAPI>["endpoints"]["generateOpenAPISchema"]>
>;

export function generateAuthOpenAPISchema(auth: {
  api: { generateOpenAPISchema: () => Promise<AuthOpenAPISchema> };
}): Promise<AuthOpenAPISchema> {
  return auth.api.generateOpenAPISchema();
}

export { drizzleAdapter } from "@better-auth/drizzle-adapter";

export { resolveAuthCliPath, createAdminRecovery } from "./internal/operator";
