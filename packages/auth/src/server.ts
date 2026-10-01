import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";

export function createAuthServer(options: BetterAuthOptions) {
  return betterAuth(options);
}

export { betterAuth };
export { hashPassword, verifyPassword } from "better-auth/crypto";
export { drizzleAdapter } from "@better-auth/drizzle-adapter";
