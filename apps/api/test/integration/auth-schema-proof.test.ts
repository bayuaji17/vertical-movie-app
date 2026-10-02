import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { SQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

import {
  drizzleAdapter,
  createAdminAuthServer,
  hashPassword,
} from "@repo/auth/server";
import { applyDatabaseMigrations } from "../../src/db/migrate";
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

async function applyBaseline() {
  const baseline = await mkdtemp(join(tmpdir(), "auth-baseline-"));
  try {
    await cp(
      resolve(import.meta.dir, "../../drizzle/0000_auth-admin.sql"),
      join(baseline, "0000_auth-admin.sql"),
    );
    await cp(
      resolve(import.meta.dir, "../../drizzle/meta"),
      join(baseline, "meta"),
      { recursive: true },
    );
    const journal = await Bun.file(join(baseline, "meta/_journal.json")).json();
    journal.entries = journal.entries.slice(0, 1);
    await writeFile(
      join(baseline, "meta/_journal.json"),
      JSON.stringify(journal),
    );
    await applyDatabaseMigrations(testDatabaseUrl, baseline);
  } finally {
    await rm(baseline, { recursive: true, force: true });
  }
}

describe("auth/admin PostgreSQL schema", () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await applyBaseline();
    baselineHash = await hashPassword(fixturePassword);
    await client`INSERT INTO "user" (id,name,email,created_at,updated_at) VALUES ('legacy-admin','Legacy Admin','legacy@example.test',now(),now())`;
    await client`INSERT INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('legacy-account','legacy-admin','credential','legacy-admin',${baselineHash},now(),now())`;
    await client`INSERT INTO admin_identity (user_id) VALUES ('legacy-admin')`;
    await client`INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES ('legacy-session','fixture-old-token','legacy-admin',now()+interval '1 day',now(),now())`;
    await applyDatabaseMigrations(testDatabaseUrl);
    await applyDatabaseMigrations(testDatabaseUrl);
  });

  afterAll(async () => {
    await client.close();
  });

  it("applies a fresh migration and skips it on re-run", async () => {
    const tables = await client`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    expect(tables.map((row: { tablename: string }) => row.tablename)).toEqual([
      "account",
      "admin_identity",
      "rate_limit",
      "session",
      "user",
      "verification",
    ]);

    const migrationRows = await client`
      SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations
    `;
    expect(migrationRows[0]?.count).toBe(2);
  });

  it("upgrades the existing admin without rewriting credentials or sessions", async () => {
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
    const native = createAdminAuthServer({
      database: db,
      origin: "http://localhost:3000",
      secret: "schema-native-proof-secret-with-no-live-credentials",
      secureCookies: false,
    });
    const login = await native.api.signInEmail({
      body: { email: "legacy@example.test", password: fixturePassword },
    });
    expect(login.user.id).toBe("legacy-admin");
    expect(login.user.role).toBe("admin");
    await db.delete(schema.adminIdentity);
    await db.delete(schema.user).where(eq(schema.user.id, "legacy-admin"));
  });

  it("enforces canonical roles and the single native admin under concurrency", async () => {
    const native = createAdminAuthServer({
      database: db,
      origin: "http://localhost:3000",
      secret: "schema-native-proof-secret-with-no-live-credentials",
      secureCookies: false,
    });
    const results = await Promise.allSettled(
      ["native-one", "native-two"].map((name) =>
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
    for (const role of ["admin,user", "owner"]) {
      await expectPostgresFailure(async () => {
        await db
          .update(schema.user)
          .set({ role })
          .where(eq(schema.user.id, admins[0]!.id));
      }, "23514");
    }
    await db.delete(schema.user).where(eq(schema.user.role, "admin"));
  });

  it("preserves expected indexes, timestamp mappings, limiter, and admin constraints", async () => {
    const indexes = await client`
      SELECT indexname FROM pg_catalog.pg_indexes
      WHERE schemaname = 'public'
    `;
    const indexNames = indexes.map(
      (row: { indexname: string }) => row.indexname,
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "account_userId_idx",
        "session_userId_idx",
        "verification_identifier_idx",
        "rate_limit_key_unique",
        "admin_identity_user_id_unique",
        "user_email_unique",
      ]),
    );

    const columns = await client`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name = 'user' AND column_name IN ('email_verified', 'created_at')
          OR table_name = 'rate_limit' AND column_name = 'last_request')
    `;
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

    const adminConstraints = await client`
      SELECT conname, contype
      FROM pg_catalog.pg_constraint
      WHERE conrelid = 'public.admin_identity'::regclass
    `;
    expect(adminConstraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conname: "admin_identity_singleton_key_check",
          contype: "c",
        }),
        expect.objectContaining({
          conname: "admin_identity_user_id_unique",
          contype: "u",
        }),
        expect.objectContaining({
          conname: "admin_identity_user_id_user_id_fk",
          contype: "f",
        }),
      ]),
    );
  });

  it("uses the generated schema with the Better Auth adapter for auth and limiter records", async () => {
    const email = `schema-adapter-${crypto.randomUUID()}@example.test`;
    const user = await adapter.create({
      model: "user",
      data: {
        name: "Schema Adapter",
        email,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    expect(user.email).toBe(email);

    await adapter.create({
      model: "rateLimit",
      data: {
        key: `schema-key-${crypto.randomUUID()}`,
        count: 1,
        lastRequest: Date.now(),
      },
    });
    const rateLimits = await db.select().from(schema.rateLimit);
    expect(rateLimits).toHaveLength(1);
  });

  it("enforces the one-admin key, rejects a second claim, and validates the user foreign key", async () => {
    await insertUser("schema-admin-1", "admin-one@example.test");
    await insertUser("schema-admin-2", "admin-two@example.test");

    await db.insert(schema.adminIdentity).values({ userId: "schema-admin-1" });
    await expectPostgresFailure(async () => {
      await db
        .insert(schema.adminIdentity)
        .values({ userId: "schema-admin-2" });
    }, "23505");
    await expectPostgresFailure(async () => {
      await db.insert(schema.adminIdentity).values({
        id: "secondary",
        userId: "schema-admin-2",
      });
    }, "23514");

    await db.delete(schema.adminIdentity);
    await expectPostgresFailure(async () => {
      await db.insert(schema.adminIdentity).values({
        userId: "missing-admin-user",
      });
    }, "23503");
  });

  it("rolls back a user and singleton claim together", async () => {
    const id = "schema-rollback-admin";
    const failure = new Error("expected auth schema transaction rollback");

    await expect(
      db.transaction(async (transaction) => {
        await transaction.insert(schema.user).values({
          id,
          name: "Rollback Admin",
          email: "rollback-admin@example.test",
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await transaction.insert(schema.adminIdentity).values({ userId: id });
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(
      await db.select().from(schema.user).where(eq(schema.user.id, id)),
    ).toHaveLength(0);
    expect(await db.select().from(schema.adminIdentity)).toHaveLength(0);
  });
  it("refuses an inconsistent legacy admin and rolls back expansion", async () => {
    await resetTestDatabase();
    await applyBaseline();
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
