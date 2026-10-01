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

import { hashPassword } from "@repo/auth/server";
import { createApp } from "../../src/app";
import { applyDatabaseMigrations } from "../../src/db/migrate";
import * as schema from "../../src/db/schema";
import { createAdminAuth, createAdminPolicy } from "../../src/modules/auth";

const testDatabaseName = "vertical_movie_app_auth_runtime_test";
const authOrigin = "http://localhost:3000";
const fixturePassword = "correct-horse-battery-staple-2026";

function getTestDatabaseUrl(): string {
  const value = Bun.env.AUTH_RUNTIME_TEST_DATABASE_URL;
  if (!value) {
    throw new Error(
      "Set AUTH_RUNTIME_TEST_DATABASE_URL to the dedicated local auth runtime test database.",
    );
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(value);
  } catch {
    throw new Error(
      "AUTH_RUNTIME_TEST_DATABASE_URL must be a valid local PostgreSQL URL.",
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
  secret: "auth-runtime-proof-secret-never-use-outside-this-test",
  secureCookies: false,
  isAdminUser: createAdminPolicy(database),
});
const app = createApp({ auth });

const fixtures = {
  admin: { id: "runtime-admin", email: "admin@example.test" },
  user: { id: "runtime-user", email: "user@example.test" },
};

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

async function createFixtureUser(id: string, email: string, admin = false) {
  const now = new Date();
  await database.insert(schema.user).values({
    id,
    name: "Runtime Test",
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  await database.insert(schema.account).values({
    id: `credential-${id}`,
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(fixturePassword),
    createdAt: now,
    updatedAt: now,
  });
  if (admin) {
    await database.insert(schema.adminIdentity).values({
      id: "primary",
      userId: id,
    });
  }
}

function makeRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    origin?: string;
    urlOrigin?: string;
  } = {},
) {
  const headers = new Headers({
    Origin: options.origin ?? authOrigin,
    ...options.headers,
  });
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  return new Request(`${options.urlOrigin ?? authOrigin}${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function signIn(
  email: string,
  password = fixturePassword,
  headers: Record<string, string> = {},
) {
  return app.handle(
    makeRequest("/api/auth/sign-in/email", {
      method: "POST",
      body: { email, password },
      headers,
    }),
  );
}

function sessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const session = setCookie
    .split(/,\s*(?=[^;,]+=)/)
    .find((cookie) => cookie.trim().startsWith("better-auth.session_token="));
  if (!session) throw new Error("Expected the Better Auth session cookie.");
  return session.split(";")[0]!.trim();
}

describe("admin auth HTTP runtime", () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await applyDatabaseMigrations(testDatabaseUrl);
    await createFixtureUser(fixtures.admin.id, fixtures.admin.email, true);
    await createFixtureUser(fixtures.user.id, fixtures.user.email);
  });

  beforeEach(async () => {
    await database.delete(schema.session);
    await database.delete(schema.rateLimit);
  });

  afterAll(async () => {
    await client.close();
  });

  it("keeps the public root available without a session", async () => {
    const response = await app.handle(new Request(`${authOrigin}/`));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello Elysia");
  });

  it("signs in the configured admin, reads a fixed 24-hour session, and signs out", async () => {
    const response = await signIn(fixtures.admin.email);
    expect(response.status).toBe(200);
    const signInBody = (await response.json()) as {
      user: { id: string; email: string };
      token: string;
    };
    expect(signInBody.user).toMatchObject({
      id: fixtures.admin.id,
      email: fixtures.admin.email,
    });
    expect(signInBody.token).toBeString();

    const cookie = sessionCookie(response);
    const sessionCookieHeader = response.headers.get("set-cookie") ?? "";
    expect(sessionCookieHeader).toContain("HttpOnly");
    expect(sessionCookieHeader).toContain("SameSite=Lax");
    expect(sessionCookieHeader).not.toContain("Secure");
    expect(sessionCookieHeader).not.toContain("session_data");

    const [storedSession] = await database
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, fixtures.admin.id))
      .limit(1);
    expect(storedSession).toBeDefined();
    expect(
      storedSession!.expiresAt.getTime() - storedSession!.createdAt.getTime(),
    ).toBe(24 * 60 * 60 * 1000);

    const getSession = await app.handle(
      makeRequest("/api/auth/get-session", {
        headers: { Cookie: cookie },
      }),
    );
    expect(getSession.status).toBe(200);
    expect(await getSession.json()).toMatchObject({
      user: { id: fixtures.admin.id },
    });
    expect(getSession.headers.get("cache-control")).toContain("no-store");

    const [afterRead] = await database
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, fixtures.admin.id))
      .limit(1);
    expect(afterRead!.expiresAt).toEqual(storedSession!.expiresAt);

    const signOut = await app.handle(
      makeRequest("/api/auth/sign-out", {
        method: "POST",
        headers: { Cookie: cookie },
        body: {},
      }),
    );
    expect(signOut.status).toBe(200);
    const afterSignOut = await app.handle(
      makeRequest("/api/auth/get-session", {
        headers: { Cookie: cookie },
      }),
    );
    expect(await afterSignOut.json()).toBeNull();
  });

  it("returns a safe credential error and does not create a session", async () => {
    const response = await signIn(fixtures.admin.email, "wrong-password");
    const body = await response.text();
    expect(response.status).toBe(401);
    expect(body).not.toContain("wrong-password");
    expect(body).not.toContain("auth-runtime-proof-secret");
    expect(await database.select().from(schema.session)).toHaveLength(0);
  });

  it("denies authenticated non-admin identities before creating a session", async () => {
    const response = await signIn(fixtures.user.email);
    expect(response.status).toBe(403);
    expect(await database.select().from(schema.session)).toHaveLength(0);
  });

  it("rejects a foreign Origin without creating a session", async () => {
    const response = await app.handle(
      makeRequest("/api/auth/sign-in/email", {
        method: "POST",
        origin: "https://attacker.example",
        body: { email: fixtures.admin.email, password: fixturePassword },
      }),
    );
    expect(response.status).toBe(403);
    expect(await database.select().from(schema.session)).toHaveLength(0);
  });

  it("rejects signup and email/password recovery endpoints at the HTTP handler", async () => {
    const disabledRequests = [
      "/api/auth/sign-up/email",
      "/api/auth/request-password-reset",
      "/api/auth/reset-password",
      "/api/auth/reset-password/forged-token",
      "/api/auth/send-verification-email",
      "/api/auth/verify-email",
      "/api/auth/change-password",
      "/api/auth/update-user",
      "/api/auth/delete-user",
    ];
    for (const path of disabledRequests) {
      const response = await app.handle(
        makeRequest(path, { method: "POST", body: {} }),
      );
      expect(response.status).toBe(404);
    }
  });

  it("limits repeated password attempts without trusting spoofed IP headers", async () => {
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 6; attempt++) {
      const response = await signIn("missing@example.test", "wrong-password", {
        "X-Forwarded-For": `198.51.100.${attempt}`,
      });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);

    const limiterRows = await database.select().from(schema.rateLimit);
    expect(limiterRows).toHaveLength(1);
    expect(limiterRows[0]!.key).not.toContain("198.51.100.");
    expect(limiterRows[0]!.key).toContain("/sign-in/email");
  });

  it("sets secure, HTTP-only, same-site, host-only cookies for HTTPS", async () => {
    const productionAuth = createAdminAuth({
      database,
      origin: "https://admin.example.test",
      secret: "auth-runtime-proof-production-only-test-secret",
      secureCookies: true,
      isAdminUser: createAdminPolicy(database),
    });
    const productionApp = createApp({ auth: productionAuth });
    const response = await productionApp.handle(
      makeRequest("/api/auth/sign-in/email", {
        urlOrigin: "https://admin.example.test",
        origin: "https://admin.example.test",
        method: "POST",
        body: { email: fixtures.admin.email, password: fixturePassword },
      }),
    );
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Domain=");
  });
});
