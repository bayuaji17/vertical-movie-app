import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { SQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { Elysia, t } from "elysia";

import { createApp } from "../../src/app";
import { applyDatabaseMigrations } from "../../src/db/migrate";
import * as schema from "../../src/db/schema";
import { createAdminAuth, createAdminPolicy } from "../../src/modules/auth";
import { createRequireAdmin } from "../../src/modules/auth/admin/guard";
import { AdminAuthErrorResponse } from "../../src/modules/auth/admin/model";
import { provisionAdmin } from "../../src/modules/auth/admin-provision";

const testDatabaseName = "vertical_movie_app_auth_admin_test";
const authOrigin = "http://localhost:3000";
const adminEmail = "authorized-admin@example.test";
const adminPassword = "authorized-admin-password-2026";

function getTestDatabaseUrl(): string {
  const value = Bun.env.AUTH_ADMIN_TEST_DATABASE_URL;
  if (!value) {
    throw new Error(
      "Set AUTH_ADMIN_TEST_DATABASE_URL to the dedicated local admin test database.",
    );
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(value);
  } catch {
    throw new Error(
      "AUTH_ADMIN_TEST_DATABASE_URL must be a valid local PostgreSQL URL.",
    );
  }
  if (
    !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      parsedDatabaseUrl.hostname,
    ) ||
    parsedDatabaseUrl.pathname !== `/${testDatabaseName}`
  ) {
    throw new Error(
      `Refusing to reset a database other than ${testDatabaseName} on localhost.`,
    );
  }

  return value;
}

const testDatabaseUrl = getTestDatabaseUrl();
const client = new SQL(testDatabaseUrl);
const database = drizzle({ client, schema });
const auth = createAdminAuth({
  database,
  origin: authOrigin,
  secret: "auth-admin-authorization-proof-secret-never-use-outside-this-test",
  secureCookies: false,
  isAdminUser: createAdminPolicy(database),
});
const isAdminUser = createAdminPolicy(database);
const adminDependencies = {
  getSession: (headers: Headers) => auth.api.getSession({ headers }),
  isAdminUser,
};
const app = createApp({ auth, admin: adminDependencies });

async function resetTestDatabase() {
  const resetClient = new SQL(testDatabaseUrl);
  try {
    await resetClient.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await resetClient.unsafe("CREATE SCHEMA public");
    await resetClient.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  } finally {
    await resetClient.close();
  }
}

function signInRequest() {
  return app.handle(
    new Request(`${authOrigin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: authOrigin,
      },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    }),
  );
}

function sessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const sessionCookie = setCookie
    .split(/,\s*(?=[^;,]+=)/u)
    .find((cookie) => cookie.trim().startsWith("better-auth.session_token="));
  if (!sessionCookie)
    throw new Error("Expected the Better Auth session cookie.");
  return sessionCookie.split(";")[0]!.trim();
}

function adminSessionRequest(cookie?: string) {
  return app.handle(
    new Request(`${authOrigin}/admin/session`, {
      headers: cookie ? { Cookie: cookie } : {},
    }),
  );
}

async function provisionAndSignIn() {
  const admin = await provisionAdmin(database, {
    email: adminEmail,
    password: adminPassword,
  });
  const response = await signInRequest();
  expect(response.status).toBe(200);
  return { userId: admin.userId, cookie: sessionCookie(response) };
}

describe("admin route authorization", () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await applyDatabaseMigrations(testDatabaseUrl);
  });

  beforeEach(async () => {
    await database.delete(schema.adminIdentity);
    await database.delete(schema.session);
    await database.delete(schema.account);
    await database.delete(schema.user);
    await database.delete(schema.rateLimit);
    await database.delete(schema.verification);
  });

  afterAll(async () => {
    await client.close();
  });

  it("keeps public access open and stops denied requests before protected work", async () => {
    const publicResponse = await app.handle(new Request(`${authOrigin}/`));
    expect(publicResponse.status).toBe(200);

    const privateResponse = await adminSessionRequest();
    expect(privateResponse.status).toBe(401);
    const authError = await privateResponse.json();
    expect(authError.error.code).toBe("AUTH_REQUIRED");
    expect(typeof authError.error.message).toBe("string");

    let writes = 0;
    const writeFixture = new Elysia({ name: "admin-write-fixture" })
      .use(createRequireAdmin(adminDependencies))
      .post(
        "/admin/write-fixture",
        () => {
          writes += 1;
          return { written: true };
        },
        {
          requireAdmin: true,
          response: {
            200: t.Object({ written: t.Boolean() }),
            401: AdminAuthErrorResponse,
            403: AdminAuthErrorResponse,
            503: AdminAuthErrorResponse,
          },
        },
      );
    const rejectedWrite = await writeFixture.handle(
      new Request(`${authOrigin}/admin/write-fixture`, { method: "POST" }),
    );
    expect(rejectedWrite.status).toBe(401);
    expect(writes).toBe(0);
  });

  it("returns only the admin session DTO and rejects invalid, expired, or revoked cookies", async () => {
    const { userId, cookie } = await provisionAndSignIn();
    const response = await adminSessionRequest(cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const responseBody = await response.text();
    const body = JSON.parse(responseBody);
    expect(body.user).toEqual({
      id: userId,
      name: adminEmail,
      email: adminEmail,
    });
    expect(Object.keys(body).sort()).toEqual(["session", "user"]);
    expect(Object.keys(body.user).sort()).toEqual(["email", "id", "name"]);
    expect(Object.keys(body.session)).toEqual(["expiresAt"]);
    expect(typeof body.session.expiresAt).toBe("string");
    expect(body.session.expiresAt.endsWith("Z")).toBe(true);
    expect(Number.isNaN(Date.parse(body.session.expiresAt))).toBe(false);
    expect(new Date(body.session.expiresAt).toISOString()).toBe(
      body.session.expiresAt,
    );

    const invalid = await adminSessionRequest(
      "better-auth.session_token=invalid-token",
    );
    expect(invalid.status).toBe(401);

    await database
      .update(schema.session)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.session.userId, userId));
    const expired = await adminSessionRequest(cookie);
    expect(expired.status).toBe(401);

    const freshResponse = await signInRequest();
    expect(freshResponse.status).toBe(200);
    const freshCookie = sessionCookie(freshResponse);
    await database
      .delete(schema.session)
      .where(eq(schema.session.userId, userId));
    const revoked = await adminSessionRequest(freshCookie);
    expect(revoked.status).toBe(401);
  });

  it("returns 403 for a valid session whose singleton admin identity was removed", async () => {
    const { userId, cookie } = await provisionAndSignIn();
    await database
      .delete(schema.adminIdentity)
      .where(eq(schema.adminIdentity.userId, userId));

    const response = await adminSessionRequest(cookie);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "ADMIN_FORBIDDEN" },
    });
  });

  it("maps authorization database failures to a safe 503 response", async () => {
    const { cookie } = await provisionAndSignIn();
    const failedApp = createApp({
      auth,
      admin: {
        getSession: adminDependencies.getSession,
        isAdminUser: async () => {
          throw new Error(`private database detail: ${testDatabaseUrl}`);
        },
      },
    });
    const response = await failedApp.handle(
      new Request(`${authOrigin}/admin/session`, {
        headers: { Cookie: cookie },
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("AUTH_DEPENDENCY_UNAVAILABLE");
    expect(body).not.toContain(testDatabaseUrl);
    expect(body).not.toContain("private database detail");
  });
});
