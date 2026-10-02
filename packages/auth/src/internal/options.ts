import type { BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { openAPI } from "better-auth/plugins";
import { disabledAuthPaths, passwordPolicy } from "./policy";

export type AuthConfiguration = {
  origin: string;
  secret: string;
  secureCookies: boolean;
};
export function createAuthOptions(config: AuthConfiguration) {
  return {
    appName: "Vertical Movie Admin",
    baseURL: config.origin,
    basePath: "/api/auth",
    secret: config.secret,
    trustedOrigins: [config.origin],
    plugins: [
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      openAPI({ disableDefaultReference: true }),
    ],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: passwordPolicy.minLength,
      maxPasswordLength: passwordPolicy.maxLength,
      revokeSessionsOnPasswordReset: true,
    },
    session: {
      expiresIn: 86400,
      updateAge: 0,
      disableSessionRefresh: true,
      cookieCache: { enabled: true, maxAge: 60, refreshCache: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    disabledPaths: [...disabledAuthPaths],
    advanced: {
      useSecureCookies: config.secureCookies,
      ipAddress: { ipAddressHeaders: [] },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secureCookies,
      },
    },
  } satisfies BetterAuthOptions;
}
