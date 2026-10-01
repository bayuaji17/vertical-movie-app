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
import {
  AdminProvisionConflictError,
  provisionAdmin,
} from "../../src/modules/auth/admin-provision";

const testDatabaseName = "vertical_movie_app_auth_admin_test";
const authOrigin = "http://localhost:3000";
const fixturePassword = "correct-horse-battery-staple-2026";

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
  secret: "auth-admin-proof-secret-never-use-outside-this-test",
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

async function countsForEmail(email: string) {
  const users = await database
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email));
  const accounts = await database
    .select({ id: schema.account.id })
    .from(schema.account)
    .innerJoin(schema.user, eq(schema.account.userId, schema.user.id))
    .where(eq(schema.user.email, email));
  const identities = await database.select().from(schema.adminIdentity);
  return {
    users: users.length,
    accounts: accounts.length,
    identities: identities.length,
  };
}

describe("single-admin provisioning", () => {
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

  it("creates a CLI admin who can sign in through the real HTTP endpoint", async () => {
    const result = await provisionAdmin(database, {
      email: "  First.Admin@Example.Test ",
      password: fixturePassword,
    });
    expect(result.status).toBe("created");

    const rows = await countsForEmail("first.admin@example.test");
    expect(rows).toEqual({ users: 1, accounts: 1, identities: 1 });
    expect(await database.select().from(schema.session)).toHaveLength(0);

    const response = await signInRequest(
      "first.admin@example.test",
      fixturePassword,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { id: result.userId, email: "first.admin@example.test" },
    });
  });

  it("makes a retry with the same email a no-op without changing the password", async () => {
    const first = await provisionAdmin(database, {
      email: "same@example.test",
      password: fixturePassword,
    });
    const retry = await provisionAdmin(database, {
      email: " SAME@example.test ",
      password: "different-password-that-is-valid",
    });

    expect(first.status).toBe("created");
    expect(retry).toEqual({
      status: "already-provisioned",
      userId: first.userId,
    });
    expect(await countsForEmail("same@example.test")).toEqual({
      users: 1,
      accounts: 1,
      identities: 1,
    });
    expect(
      (await signInRequest("same@example.test", fixturePassword)).status,
    ).toBe(200);
    expect(
      (
        await signInRequest(
          "same@example.test",
          "different-password-that-is-valid",
        )
      ).status,
    ).toBe(401);
  });

  it("rejects a second identity without creating user or credential rows", async () => {
    await provisionAdmin(database, {
      email: "first@example.test",
      password: fixturePassword,
    });

    await expect(
      provisionAdmin(database, {
        email: "second@example.test",
        password: fixturePassword,
      }),
    ).rejects.toBeInstanceOf(AdminProvisionConflictError);
    expect(await countsForEmail("second@example.test")).toEqual({
      users: 0,
      accounts: 0,
      identities: 1,
    });
  });

  it("serializes concurrent attempts so only one identity is created", async () => {
    const results = await Promise.allSettled([
      provisionAdmin(database, {
        email: "race-one@example.test",
        password: fixturePassword,
      }),
      provisionAdmin(database, {
        email: "race-two@example.test",
        password: fixturePassword,
      }),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(
      rejected?.status === "rejected" ? rejected.reason : undefined,
    ).toBeInstanceOf(AdminProvisionConflictError);
    expect(await database.select().from(schema.user)).toHaveLength(1);
    expect(await database.select().from(schema.account)).toHaveLength(1);
    expect(await database.select().from(schema.adminIdentity)).toHaveLength(1);
  });

  it("rolls user and credential rows back when the singleton insert fails", async () => {
    await client.unsafe(`
      CREATE FUNCTION reject_admin_identity_insert() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'injected admin identity failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await client.unsafe(`
      CREATE TRIGGER reject_admin_identity_insert
      BEFORE INSERT ON admin_identity
      FOR EACH ROW EXECUTE FUNCTION reject_admin_identity_insert()
    `);

    try {
      await expect(
        provisionAdmin(database, {
          email: "rollback@example.test",
          password: fixturePassword,
        }),
      ).rejects.toThrow();
      expect(await countsForEmail("rollback@example.test")).toEqual({
        users: 0,
        accounts: 0,
        identities: 0,
      });
    } finally {
      await client.unsafe(
        "DROP TRIGGER IF EXISTS reject_admin_identity_insert ON admin_identity",
      );
      await client.unsafe(
        "DROP FUNCTION IF EXISTS reject_admin_identity_insert()",
      );
    }
  });

  it("reads the password from stdin and keeps it out of CLI output", async () => {
    const email = "cli-admin@example.test";
    const child = Bun.spawn(
      [process.execPath, "run", "src/modules/auth/provision-cli.ts", email],
      {
        cwd: resolve(import.meta.dir, "../.."),
        env: { ...Bun.env, DATABASE_URL: testDatabaseUrl },
        stdin: new Blob([`${fixturePassword}\n`]),
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
    expect(stdout).toContain("Admin provisioned.");
    expect(`${stdout}\n${stderr}`).not.toContain(fixturePassword);
    expect(`${stdout}\n${stderr}`).not.toContain(testDatabaseUrl);
    expect(await countsForEmail(email)).toEqual({
      users: 1,
      accounts: 1,
      identities: 1,
    });
    expect((await signInRequest(email, fixturePassword)).status).toBe(200);
  });
});
