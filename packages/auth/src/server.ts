import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { openAPI } from "better-auth/plugins";

export function createAuthServer<const TOptions extends BetterAuthOptions>(
  options: TOptions,
) {
  return betterAuth(options);
}

export type AuthOpenAPISchema = Awaited<
  ReturnType<ReturnType<typeof openAPI>["endpoints"]["generateOpenAPISchema"]>
>;

export function generateAuthOpenAPISchema(auth: {
  api: { generateOpenAPISchema: () => Promise<AuthOpenAPISchema> };
}): Promise<AuthOpenAPISchema> {
  return auth.api.generateOpenAPISchema();
}

export { betterAuth };
export { openAPI };
export type { BetterAuthOptions };
export { APIError } from "better-auth/api";
export { createAuthMiddleware } from "better-auth/api";
export { hashPassword, verifyPassword } from "better-auth/crypto";
export { drizzleAdapter } from "@better-auth/drizzle-adapter";
