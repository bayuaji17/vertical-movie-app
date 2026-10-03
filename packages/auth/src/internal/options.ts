import type { BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { openAPI } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import {
  disabledAuthPaths,
  passwordPolicy,
  isDisabledAuthPath,
} from "./policy";

export type AuthConfiguration = {
  origin: string;
  secret: string;
  secureCookies: boolean;
  onRecoveryToken?: (input: { token: string }) => Promise<void>;
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
      ...(config.onRecoveryToken
        ? { sendResetPassword: config.onRecoveryToken }
        : {}),
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
    hooks: {
      before: createAuthMiddleware(async (context) => {
        // The native admin endpoint currently checks only the maximum length.
        // Apply the configured policy to trusted CLI creation as well.
        if (context.path === "/admin/create-user") {
          const password = context.body?.password;
          if (
            typeof password === "string" &&
            password.length < passwordPolicy.minLength
          ) {
            throw APIError.from("BAD_REQUEST", {
              code: "PASSWORD_TOO_SHORT",
              message: "Password must contain at least 12 characters.",
            });
          }
        }
        if (!context.request) return;
        if (isDisabledAuthPath(context.path, context.request.method)) {
          throw APIError.from("NOT_FOUND", {
            code: "NOT_FOUND",
            message: "This operation is unavailable.",
          });
        }
        // Native CSRF accepts some non-browser requests without Fetch Metadata.
        // The application's one-origin contract also checks any supplied Origin.
        const origin = context.request.headers.get("origin");
        if (origin !== null && origin !== config.origin) {
          throw APIError.from("FORBIDDEN", {
            code: "INVALID_ORIGIN",
            message: "Requests must come from the configured web origin.",
          });
        }
      }),
    },
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
