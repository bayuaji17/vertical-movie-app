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
import { resolve } from "node:path";

import { createApp } from "../../src/app";
import { applyDatabaseMigrations } from "../../src/db/migrate";
import * as schema from "../../src/db/schema";
import { createAdminAuth, createAdminPolicy } from "../../src/modules/auth";
import { provisionAdmin } from "../../src/modules/auth/admin-provision";
import {
  AdminRecoveryUnavailableError,
  resetAdminPassword,
} from "../../src/modules/auth/admin-recovery";

const testDatabaseName = "vertical_movie_app_auth_admin_test";
const authOrigin = "http://localhost:3000";
const originalPassword = "original-admin-password-2026";
const replacementPassword = "replacement-admin-password-2026";

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
  secret: "auth-admin-recovery-proof-secret-never-use-outside-this-test",
  secureCookies: false,
  isAdminUser: createAdminPolicy(database),
});
const app = createApp({ auth });

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

function signInRequest(email: string, password: string) {
  return app.handle(
    new Request(`${authOrigin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: authOrigin,
      },
      body: JSON.stringify({ email, password }),
    }),
  );
}

function getSessionRequest(cookie: string) {
  return app.handle(
    new Request(`${authOrigin}/api/auth/get-session`, {
      headers: { Cookie: cookie, Origin: authOrigin },
    }),
  );
}

function sessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  expect(setCookie).not.toBeNull();
  return setCookie!.split(";")[0]!;
}

async function createAdminAndSessions(email: string) {
  const admin = await provisionAdmin(database, {
    email,
    password: originalPassword,
  });
  const firstResponse = await signInRequest(email, originalPassword);
  const secondResponse = await signInRequest(email, originalPassword);
  expect(firstResponse.status).toBe(200);
  expect(secondResponse.status).toBe(200);
  return {
    userId: admin.userId,
    cookies: [sessionCookie(firstResponse), sessionCookie(secondResponse)],
  };
}

describe("admin password recovery", () => {
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

  it("resets through the CLI, preserves the singleton, and invalidates every old session", async () => {
    const email = "recovery-admin@example.test";
    const { userId, cookies } = await createAdminAndSessions(email);
    expect(await database.select().from(schema.session)).toHaveLength(2);

    const child = Bun.spawn(
      [process.execPath, "run", "src/modules/auth/reset-cli.ts"],
      {
        cwd: resolve(import.meta.dir, "../.."),
        env: { ...Bun.env, DATABASE_URL: testDatabaseUrl },
        stdin: new Blob([`${replacementPassword}\n`]),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "Admin password reset; all active sessions were revoked.",
    );
    expect(`${stdout}\n${stderr}`).not.toContain(replacementPassword);
    expect(`${stdout}\n${stderr}`).not.toContain(testDatabaseUrl);
    expect(await database.select().from(schema.session)).toHaveLength(0);
    expect(await database.select().from(schema.adminIdentity)).toEqual([
      { id: "primary", userId },
    ]);
    expect(
      await database
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, email)),
    ).toEqual([{ id: userId }]);

    for (const cookie of cookies) {
      expect(await (await getSessionRequest(cookie)).json()).toBeNull();
    }
    expect((await signInRequest(email, originalPassword)).status).toBe(401);
    expect((await signInRequest(email, replacementPassword)).status).toBe(200);
    expect(await database.select().from(schema.session)).toHaveLength(1);
  });

  it("rolls the password update back when session revocation fails", async () => {
    const email = "recovery-rollback@example.test";
    const { cookies } = await createAdminAndSessions(email);
    const originalSessions = await database.select().from(schema.session);
    expect(originalSessions).toHaveLength(2);

    await client.unsafe(`
      CREATE FUNCTION reject_admin_session_delete() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'injected session revocation failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await client.unsafe(`
      CREATE TRIGGER reject_admin_session_delete
      BEFORE DELETE ON session
      FOR EACH ROW EXECUTE FUNCTION reject_admin_session_delete()
    `);

    try {
      await expect(
        resetAdminPassword(database, { password: replacementPassword }),
      ).rejects.toThrow();
      expect(await database.select().from(schema.session)).toHaveLength(2);
      for (const cookie of cookies) {
        const response = await getSessionRequest(cookie);
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ user: { email } });
      }
    } finally {
      await client.unsafe(
        "DROP TRIGGER IF EXISTS reject_admin_session_delete ON session",
      );
      await client.unsafe(
        "DROP FUNCTION IF EXISTS reject_admin_session_delete()",
      );
    }

    expect((await signInRequest(email, originalPassword)).status).toBe(200);
    expect((await signInRequest(email, replacementPassword)).status).toBe(401);
  });

  it("returns a safe error when no administrator is provisioned", async () => {
    await expect(
      resetAdminPassword(database, { password: replacementPassword }),
    ).rejects.toBeInstanceOf(AdminRecoveryUnavailableError);

    const child = Bun.spawn(
      [process.execPath, "run", "src/modules/auth/reset-cli.ts"],
      {
        cwd: resolve(import.meta.dir, "../.."),
        env: { ...Bun.env, DATABASE_URL: testDatabaseUrl },
        stdin: new Blob([`${replacementPassword}\n`]),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);

    expect(exitCode).toBe(1);
    expect(`${stdout}\n${stderr}`).toContain("provision the admin first");
    expect(`${stdout}\n${stderr}`).not.toContain(replacementPassword);
    expect(`${stdout}\n${stderr}`).not.toContain(testDatabaseUrl);
    expect(await database.select().from(schema.user)).toHaveLength(0);
    expect(await database.select().from(schema.account)).toHaveLength(0);
    expect(await database.select().from(schema.session)).toHaveLength(0);
  });

  it("rejects a user-supplied target instead of accepting a user ID", async () => {
    const userId = "user-id-that-must-not-select-the-target";
    const child = Bun.spawn(
      [process.execPath, "run", "src/modules/auth/reset-cli.ts", userId],
      {
        cwd: resolve(import.meta.dir, "../.."),
        env: { ...Bun.env, DATABASE_URL: testDatabaseUrl },
        stdin: new Blob([`${replacementPassword}\n`]),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);

    expect(exitCode).toBe(1);
    expect(stderr).toContain(
      "Usage: bun run --cwd apps/api admin:reset-password",
    );
    expect(`${stdout}\n${stderr}`).not.toContain(userId);
    expect(`${stdout}\n${stderr}`).not.toContain(replacementPassword);
    expect(`${stdout}\n${stderr}`).not.toContain(testDatabaseUrl);
    expect(await database.select().from(schema.user)).toHaveLength(0);
  });
});
