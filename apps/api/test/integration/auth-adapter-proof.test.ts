import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { SQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { betterAuth, drizzleAdapter, verifyPassword } from "@repo/auth/server";

import * as schema from "../fixtures/auth-probe-schema";

const testDatabaseUrl = Bun.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    "Set TEST_DATABASE_URL to the dedicated auth probe database.",
  );
}

const parsedDatabaseUrl = new URL(testDatabaseUrl);
if (
  !["localhost", "127.0.0.1", "::1"].includes(parsedDatabaseUrl.hostname) ||
  parsedDatabaseUrl.pathname !== "/vertical_movie_app_auth_test"
) {
  throw new Error(
    "Refusing to connect outside vertical_movie_app_auth_test on localhost.",
  );
}

const client = new SQL(testDatabaseUrl);
const db = drizzle({ client, schema });
const authOptions = {
  baseURL: "http://localhost:3000",
  secret: "auth-adapter-test-secret-never-use-outside-the-fixture",
  emailAndPassword: { enabled: true },
};
const databaseAdapter = drizzleAdapter(db, {
  provider: "pg",
  schema,
  transaction: true,
});
const auth = betterAuth({
  ...authOptions,
  database: databaseAdapter,
});

function authRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", authOptions.baseURL);

  return auth.handler(
    new Request(`http://localhost:3001/api/auth${path}`, {
      ...init,
      headers,
    }),
  );
}

describe("Better Auth PostgreSQL adapter with Bun SQL", () => {
  beforeAll(async () => {
    await db.delete(schema.session);
    await db.delete(schema.account);
    await db.delete(schema.verification);
    await db.delete(schema.user);
  });

  afterAll(async () => {
    await client.close();
  });

  it("rolls back all writes made inside the adapter transaction", async () => {
    const rollbackEmail = `rollback-${crypto.randomUUID()}@example.test`;
    const adapter = databaseAdapter(authOptions);
    const transactionFailure = new Error("expected transaction rollback");

    await expect(
      adapter.transaction(async (transaction) => {
        const user = await transaction.create({
          model: "user",
          data: {
            name: "Auth Probe",
            email: rollbackEmail,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await transaction.create({
          model: "account",
          data: {
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        throw transactionFailure;
      }),
    ).rejects.toBe(transactionFailure);

    expect(
      await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, rollbackEmail)),
    ).toHaveLength(0);
  });

  it("stores, verifies and reads email credentials and sessions through HTTP", async () => {
    const email = `auth-probe-${crypto.randomUUID()}@example.test`;
    const password = `probe-${crypto.randomUUID()}-WithEnoughLength`;
    const signUp = await authRequest("/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Auth Probe", email, password }),
    });

    expect(signUp.status).toBe(200);
    const signUpBody = (await signUp.json()) as {
      user: { id: string; email: string };
    };
    expect(signUpBody.user.email).toBe(email);

    const accounts = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, signUpBody.user.id));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.providerId).toBe("credential");
    expect(accounts[0]?.accountId).toBe(signUpBody.user.id);
    expect(accounts[0]?.password).toBeDefined();
    expect(accounts[0]?.password).not.toBe(password);
    expect(
      await verifyPassword({ hash: accounts[0]!.password!, password }),
    ).toBe(true);

    const signIn = await authRequest("/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(signIn.status).toBe(200);

    const cookie = signIn.headers
      .get("set-cookie")
      ?.split(/, (?=[^;,]+=)/)
      .find((part) => part.includes("better-auth.session_token"));
    expect(cookie).toBeDefined();

    const sessionResponse = await authRequest("/get-session", {
      headers: { cookie: cookie!.split(";")[0]! },
    });
    expect(sessionResponse.status).toBe(200);
    const sessionBody = (await sessionResponse.json()) as {
      session: { userId: string };
      user: { id: string };
    };
    expect(sessionBody.user.id).toBe(signUpBody.user.id);
    expect(sessionBody.session.userId).toBe(signUpBody.user.id);

    const sessions = await db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, signUpBody.user.id));
    expect(sessions.length).toBeGreaterThan(0);
  });
});
