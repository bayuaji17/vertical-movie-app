import { eq } from "drizzle-orm";

import {
  APIError,
  createAuthMiddleware,
  createAuthServer,
  drizzleAdapter,
  openAPI,
} from "@repo/auth/server";
import type { BetterAuthOptions } from "@repo/auth/server";
import * as schema from "../../db/schema";

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

export type AdminAuthDependencies = {
  database: AuthDatabase;
  origin: string;
  secret: string;
  secureCookies: boolean;
  isAdminUser: (userId: string) => Promise<boolean>;
};

export const disabledAuthPaths = [
  "/sign-up/email",
  "/request-password-reset",
  "/reset-password",
  "/send-verification-email",
  "/verify-email",
  "/change-password",
  "/set-password",
  "/update-user",
  "/delete-user",
  "/delete-user/callback",
] as const;

export const supportedAuthOperations: Readonly<
  Record<string, readonly ("get" | "post")[]>
> = {
  "/ok": ["get"],
  "/get-session": ["get", "post"],
  "/sign-in/email": ["post"],
  "/sign-out": ["post"],
};

export function isDisabledAuthPath(path: string, method?: string): boolean {
  const supportedMethods = supportedAuthOperations[path];
  const normalizedMethod = method?.toLowerCase();
  return (
    supportedMethods === undefined ||
    (normalizedMethod !== undefined &&
      !supportedMethods.some((supported) => supported === normalizedMethod)) ||
    disabledAuthPaths.includes(path as (typeof disabledAuthPaths)[number]) ||
    /^\/reset-password\/[^/]+$/.test(path)
  );
}

export function createAdminAuth({
  database,
  origin,
  secret,
  secureCookies,
  isAdminUser,
}: AdminAuthDependencies) {
  const adapter = drizzleAdapter(database, {
    provider: "pg",
    schema,
    transaction: true,
  });

  const options = {
    appName: "Vertical Movie Admin",
    baseURL: origin,
    basePath: "/api/auth",
    secret,
    database: adapter,
    trustedOrigins: [origin],
    plugins: [openAPI({ disableDefaultReference: true })],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24,
      updateAge: 0,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    },
    disabledPaths: [...disabledAuthPaths],
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (!context.request) return;
        const requestOrigin = context.request.headers.get("origin");
        if (requestOrigin === null) return;

        let parsedOrigin: string;
        try {
          parsedOrigin = new URL(requestOrigin).origin;
        } catch {
          parsedOrigin = "";
        }
        if (requestOrigin === "null" || parsedOrigin !== origin) {
          throw APIError.from("FORBIDDEN", {
            code: "INVALID_ORIGIN",
            message: "Requests must come from the configured web origin.",
          });
        }
      }),
    },
    advanced: {
      useSecureCookies: secureCookies,
      ipAddress: {
        // No reverse proxy is configured yet; forwarded browser headers are untrusted.
        // Better Auth uses one shared bucket when it cannot resolve a trusted address.
        ipAddressHeaders: [],
      },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies,
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            if (!(await isAdminUser(session.userId))) {
              throw APIError.from("FORBIDDEN", {
                code: "ADMIN_ONLY",
                message:
                  "This account is not authorized to access the admin console.",
              });
            }
            return true;
          },
        },
      },
    },
  } satisfies BetterAuthOptions;

  return createAuthServer(options);
}

export function createAdminPolicy(database: AuthDatabase) {
  return async (userId: string) => {
    const [identity] = await database
      .select({ userId: schema.adminIdentity.userId })
      .from(schema.adminIdentity)
      .where(eq(schema.adminIdentity.userId, userId))
      .limit(1);
    return identity !== undefined;
  };
}
