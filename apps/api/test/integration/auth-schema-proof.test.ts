import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { SQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

import { drizzleAdapter, createAdminAuthServer } from "@repo/auth/server";
import {
  applyDatabaseMigrations,
  applyAuthExpandMigration,
} from "../../src/db/migrate";
import * as schema from "../../src/db/schema";

const testDatabaseName = "vertical_movie_app_auth_schema_test";
function getTestDatabaseUrl(): string {
  const value = Bun.env.AUTH_SCHEMA_TEST_DATABASE_URL;
  if (!value) {
    throw new Error(
      "Set AUTH_SCHEMA_TEST_DATABASE_URL to the dedicated local schema test database.",
    );
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(value);
  } catch {
    throw new Error(
      "AUTH_SCHEMA_TEST_DATABASE_URL must be a valid local PostgreSQL URL.",
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
const fixturePassword = "upgrade-proof-password-2026";
let baselineHash = "";
const client = new SQL(testDatabaseUrl);
const db = drizzle({ client, schema });
const databaseAdapter = drizzleAdapter(db, {
  provider: "pg",
  schema,
  transaction: true,
});
const adapter = databaseAdapter({
  baseURL: "http://localhost:3000",
  secret: "auth-schema-test-secret-never-use-outside-this-fixture",
  emailAndPassword: { enabled: true },
  rateLimit: { enabled: true, storage: "database" },
});

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

async function insertUser(id: string, email: string) {
  await db.insert(schema.user).values({
    id,
    name: "Schema Test",
    email,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function expectPostgresFailure(
  action: () => Promise<unknown>,
  errno: string,
) {
  let caught: unknown;
  try {
    await action();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(Error);
  if (!(caught instanceof Error)) return;

  const cause = (caught as Error & { cause?: unknown }).cause;
  expect(cause).toBeInstanceOf(Error);
  if (!(cause instanceof Error)) return;
  expect((cause as Error & { errno?: string }).errno).toBe(errno);
}

async function applyPrefix(count = 1) {
  const baseline = await mkdtemp(join(tmpdir(), "auth-baseline-"));
  try {
    await cp(resolve(import.meta.dir, "../../drizzle"), baseline, {
      recursive: true,
    });
    await cp(
      resolve(import.meta.dir, "../../drizzle/meta"),
      join(baseline, "meta"),
      { recursive: true },
    );
    const journal = await Bun.file(join(baseline, "meta/_journal.json")).json();
    journal.entries = journal.entries.slice(0, count);
    await writeFile(
      join(baseline, "meta/_journal.json"),
      JSON.stringify(journal),
    );
    await applyDatabaseMigrations(testDatabaseUrl, baseline);
  } finally {
    await rm(baseline, { recursive: true, force: true });
  }
}

const native = createAdminAuthServer({
  database: db,
  origin: "http://localhost:3000",
  secret: "schema-native-proof-secret-with-no-live-credentials",
  secureCookies: false,
});

describe("native schema expand/cutover/contract", () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await applyPrefix();
    baselineHash = await (await native.$context).password.hash(fixturePassword);
    await client`INSERT INTO "user" (id,name,email,created_at,updated_at) VALUES ('legacy-admin','Legacy Admin','legacy@example.test',now(),now())`;
    await client`INSERT INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('legacy-account','legacy-admin','credential','legacy-admin',${baselineHash},now(),now())`;
    await client`INSERT INTO admin_identity (user_id) VALUES ('legacy-admin')`;
    await client`INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES ('legacy-session','fixture-old-token','legacy-admin',now()+interval '1 day',now(),now())`;
    const expand = Bun.spawn(
      [process.execPath, "run", "src/db/migrate.ts", "--stage=expand"],
      {
        cwd: resolve(import.meta.dir, "../.."),
        env: { ...Bun.env, DATABASE_URL: testDatabaseUrl },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [code, out] = await Promise.all([
      expand.exited,
      new Response(expand.stdout).text(),
      new Response(expand.stderr).text(),
    ]);
    expect(code).toBe(0);
    expect(out).toContain("Database migrations applied.");
    const login = await native.api.signInEmail({
      body: { email: "legacy@example.test", password: fixturePassword },
    });
    expect(login.user.id).toBe("legacy-admin");
    await applyDatabaseMigrations(testDatabaseUrl);
    await applyDatabaseMigrations(testDatabaseUrl);
  });
  afterAll(() => client.close());
  it("contracts the singleton after expansion while preserving identity/hash/session", async () => {
    expect(
      (await client`SELECT to_regclass('public.admin_identity') AS relation`)[0]
        .relation,
    ).toBeNull();
    const [row] =
      await client`SELECT u.id,u.email,u.role,a.id AS account_id,a.password FROM "user" u JOIN account a ON a.user_id=u.id WHERE u.id='legacy-admin'`;
    expect(row).toMatchObject({
      id: "legacy-admin",
      email: "legacy@example.test",
      role: "admin",
      account_id: "legacy-account",
      password: baselineHash,
    });
    expect(
      (await client`SELECT id FROM session WHERE id='legacy-session'`).length,
    ).toBe(1);
    expect(
      (
        await client`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
      )[0].count,
    ).toBe(3);
    expect(
      (
        await native.api.signInEmail({
          body: { email: "legacy@example.test", password: fixturePassword },
        })
      ).user.id,
    ).toBe("legacy-admin");
    await db.delete(schema.user).where(eq(schema.user.id, "legacy-admin"));
  });
  it("enforces canonical roles and one native admin under concurrency", async () => {
    const results = await Promise.allSettled(
      ["one", "two"].map((name) =>
        native.api.createUser({
          body: {
            email: `${name}@example.test`,
            name,
            password: fixturePassword,
            role: "admin",
          },
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const admins = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.role, "admin"));
    expect(admins).toHaveLength(1);
    expect(
      (
        await client`SELECT count(*)::int AS count FROM account a JOIN "user" u ON a.user_id=u.id WHERE u.role='admin'`
      )[0].count,
    ).toBe(1);
    for (const role of ["owner", "admin,user"])
      await expectPostgresFailure(async () => {
        await db
          .update(schema.user)
          .set({ role })
          .where(eq(schema.user.id, admins[0]!.id));
      }, "23514");
    await db.delete(schema.user).where(eq(schema.user.role, "admin"));
  });
  it("retains native indexes, timestamp mappings and database rate limiting", async () => {
    const indexes =
      await client`SELECT indexname FROM pg_catalog.pg_indexes WHERE schemaname='public'`;
    expect(indexes.map((row: { indexname: string }) => row.indexname)).toEqual(
      expect.arrayContaining([
        "account_userId_idx",
        "session_userId_idx",
        "verification_identifier_idx",
        "rate_limit_key_unique",
        "user_email_unique",
        "user_single_admin_idx",
      ]),
    );
    const columns =
      await client`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public'`;
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table_name: "user",
          column_name: "email_verified",
          data_type: "boolean",
        }),
        expect.objectContaining({
          table_name: "user",
          column_name: "created_at",
          data_type: "timestamp without time zone",
        }),
        expect.objectContaining({
          table_name: "rate_limit",
          column_name: "last_request",
          data_type: "bigint",
        }),
      ]),
    );
    await adapter.create({
      model: "rateLimit",
      data: {
        key: "native-schema-proof-key",
        count: 1,
        lastRequest: Date.now(),
      },
    });
    expect(await db.select().from(schema.rateLimit)).toHaveLength(1);
  });
  it("refuses contract if the legacy identity is no longer the native admin", async () => {
    await resetTestDatabase();
    await applyAuthExpandMigration(testDatabaseUrl);
    await client`INSERT INTO "user" (id,name,email,role,created_at,updated_at) VALUES ('mismatch','Mismatch','mismatch@example.test','user',now(),now())`;
    await client`INSERT INTO admin_identity (user_id) VALUES ('mismatch')`;
    await expect(applyDatabaseMigrations(testDatabaseUrl)).rejects.toThrow();
    expect((await client`SELECT user_id FROM admin_identity`)[0].user_id).toBe(
      "mismatch",
    );
    expect(
      (
        await client`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
      )[0].count,
    ).toBe(2);
  });
  it("refuses an inconsistent legacy credential and rolls back expansion", async () => {
    await resetTestDatabase();
    await applyPrefix();
    await client`INSERT INTO "user" (id,name,email,created_at,updated_at) VALUES ('broken-admin','Broken','broken@example.test',now(),now())`;
    await client`INSERT INTO admin_identity (user_id) VALUES ('broken-admin')`;
    await expect(applyDatabaseMigrations(testDatabaseUrl)).rejects.toThrow();
    expect(
      (
        await client`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name='user' AND column_name='role'`
      )[0].count,
    ).toBe(0);
    expect((await client`SELECT user_id FROM admin_identity`)[0].user_id).toBe(
      "broken-admin",
    );
    expect(
      (
        await client`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
      )[0].count,
    ).toBe(1);
  });
});
