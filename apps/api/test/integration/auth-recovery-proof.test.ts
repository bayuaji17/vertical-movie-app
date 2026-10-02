import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { createAdminRecovery, createAdminAuthServer } from "@repo/auth/server";
import { eq } from "drizzle-orm";
import {
  auth,
  client,
  database,
  config,
  resetDatabase,
  clearDatabase,
  createAdmin,
  signIn,
  password,
  cookie,
  cli,
  databaseUrl,
  origin,
} from "./operator-fixture";
import * as schema from "../../src/db/schema";
const replacement = "replacement-native-password-fixture-2026";
async function readOldSession(value: string) {
  return auth.api.getSession({
    headers: new Headers({ cookie: value }),
    query: { disableCookieCache: true },
  });
}
async function tokenAuth() {
  let token = "";
  const instance = createAdminAuthServer({
    ...config,
    onRecoveryToken: async (input) => {
      token = input.token;
    },
  });
  await instance.api.requestPasswordReset({
    body: { email: "admin@example.test" },
  });
  return { instance, token };
}

describe("native admin recovery in exclusive maintenance", () => {
  beforeAll(resetDatabase);
  beforeEach(clearDatabase);
  afterAll(() => client.close());
  it("CLI resets without an admin session/email service, keeps identity, and revokes old sessions", async () => {
    const { user } = await createAdmin("admin@example.test");
    const cookies = [
      cookie(await signIn(user.email)),
      cookie(await signIn(user.email)),
    ];
    const result = await cli(
      ["src/modules/auth/reset-cli.ts", user.email, "--maintenance-confirmed"],
      replacement,
    );
    expect(result.code).toBe(0);
    expect(result.output).toContain("all active sessions were revoked");
    expect(result.output).not.toContain(replacement);
    expect(result.output).not.toContain(databaseUrl);
    expect((await database.select().from(schema.user))[0]?.id).toBe(user.id);
    expect(await database.select().from(schema.session)).toHaveLength(0);
    for (const value of cookies) expect(await readOldSession(value)).toBeNull();
    expect((await signIn(user.email)).status).toBe(401);
    expect((await signIn(user.email, replacement)).status).toBe(200);
  });
  it("requires explicit maintenance confirmation and rejects missing/non-admin targets", async () => {
    const result = await cli(
      ["src/modules/auth/reset-cli.ts", "admin@example.test"],
      replacement,
    );
    expect(result.code).toBe(1);
    expect(result.output).toContain("ALL API instances");
    const recovery = createAdminRecovery(config);
    await expect(
      recovery.reset({
        email: "admin@example.test",
        password: replacement,
        maintenanceConfirmed: false,
      }),
    ).rejects.toThrow();
    await expect(
      recovery.reset({
        email: "admin@example.test",
        password: replacement,
        maintenanceConfirmed: true,
      }),
    ).rejects.toThrow();
    await auth.api.createUser({
      body: {
        email: "user@example.test",
        name: "User",
        password,
        role: "user",
      },
    });
    await expect(
      recovery.reset({
        email: "user@example.test",
        password: replacement,
        maintenanceConfirmed: true,
      }),
    ).rejects.toThrow();
    expect(await database.select().from(schema.verification)).toHaveLength(0);
  });
  it("native reset rejects expired/replayed tokens and HTTP operator endpoints stay closed", async () => {
    await createAdmin("admin@example.test");
    const expired = await tokenAuth();
    await database
      .update(schema.verification)
      .set({ expiresAt: new Date(0) })
      .where(
        eq(schema.verification.identifier, `reset-password:${expired.token}`),
      );
    await expect(
      expired.instance.api.resetPassword({
        body: { token: expired.token, newPassword: replacement },
      }),
    ).rejects.toThrow();
    const valid = await tokenAuth();
    await valid.instance.api.resetPassword({
      body: { token: valid.token, newPassword: replacement },
    });
    await expect(
      valid.instance.api.resetPassword({
        body: { token: valid.token, newPassword: password },
      }),
    ).rejects.toThrow();
    for (const path of [
      "request-password-reset",
      "reset-password",
      "admin/create-user",
    ]) {
      const response = await valid.instance.handler(
        new Request(`${origin}/api/auth/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: origin },
          body: JSON.stringify({
            email: "admin@example.test",
            token: valid.token,
            newPassword: password,
          }),
        }),
      );
      expect(response.status).toBe(404);
    }
  });
  it("a password update failure consumes the token and reports failure; native retry repairs it", async () => {
    await createAdmin("admin@example.test");
    const recovery = createAdminRecovery(config);
    const context = await recovery.auth.$context;
    const update = context.internalAdapter.updatePassword;
    context.internalAdapter.updatePassword = async () => {
      throw new Error("Injected password write failure");
    };
    try {
      await expect(
        recovery.reset({
          email: "admin@example.test",
          password: replacement,
          maintenanceConfirmed: true,
        }),
      ).rejects.toThrow();
      expect((await signIn("admin@example.test")).status).toBe(200);
    } finally {
      context.internalAdapter.updatePassword = update;
    }
    await recovery.reset({
      email: "admin@example.test",
      password: replacement,
      maintenanceConfirmed: true,
    });
    expect((await signIn("admin@example.test", replacement)).status).toBe(200);
  });
  it("revocation failure is partial, never reports success, and a new native reset repairs it", async () => {
    await createAdmin("admin@example.test");
    const old = cookie(await signIn("admin@example.test"));
    const recovery = createAdminRecovery(config);
    const context = await recovery.auth.$context;
    const revoke = context.internalAdapter.deleteUserSessions;
    context.internalAdapter.deleteUserSessions = async () => {
      throw new Error("Injected revoke failure");
    };
    try {
      await expect(
        recovery.reset({
          email: "admin@example.test",
          password: replacement,
          maintenanceConfirmed: true,
        }),
      ).rejects.toThrow();
      expect(await readOldSession(old)).not.toBeNull();
      expect((await signIn("admin@example.test")).status).toBe(401);
      expect((await signIn("admin@example.test", replacement)).status).toBe(
        200,
      );
    } finally {
      context.internalAdapter.deleteUserSessions = revoke;
    }
    await recovery.reset({
      email: "admin@example.test",
      password: replacement,
      maintenanceConfirmed: true,
    });
    expect(await readOldSession(old)).toBeNull();
    expect(await database.select().from(schema.session)).toHaveLength(0);
  });
  it("reproduces upstream online login/reset race; maintenance prevents the surviving old login", async () => {
    await createAdmin("admin@example.test");
    const recovery = createAdminRecovery(config);
    const context = await recovery.auth.$context;
    const originalVerify = context.password.verify;
    let release!: () => void;
    let checked!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const verified = new Promise<void>((resolve) => {
      checked = resolve;
    });
    context.password.verify = async (input) => {
      const accepted = await originalVerify(input);
      checked();
      await gate;
      return accepted;
    };
    const login = recovery.auth.api.signInEmail({
      body: { email: "admin@example.test", password },
    });
    try {
      await verified;
      await recovery.reset({
        email: "admin@example.test",
        password: replacement,
        maintenanceConfirmed: true,
      });
      release();
      await login;
      expect(await database.select().from(schema.session)).toHaveLength(1);
    } finally {
      release();
      context.password.verify = originalVerify;
    }
    // Exclusive maintenance: no in-flight login receiver, then reset and verify.
    await recovery.reset({
      email: "admin@example.test",
      password: replacement,
      maintenanceConfirmed: true,
    });
    expect(await database.select().from(schema.session)).toHaveLength(0);
    expect((await signIn("admin@example.test")).status).toBe(401);
    expect((await signIn("admin@example.test", replacement)).status).toBe(200);
  });
  it("CLI reports a partial revoke failure safely and a native retry completes maintenance", async () => {
    await createAdmin("admin@example.test");
    await signIn("admin@example.test");
    await client.unsafe(
      "CREATE FUNCTION reject_recovery_delete() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injected revoke failure'; END; $$ LANGUAGE plpgsql",
    );
    await client.unsafe(
      "CREATE TRIGGER reject_recovery_delete BEFORE DELETE ON session FOR EACH ROW EXECUTE FUNCTION reject_recovery_delete()",
    );
    try {
      const result = await cli(
        [
          "src/modules/auth/reset-cli.ts",
          "admin@example.test",
          "--maintenance-confirmed",
        ],
        replacement,
      );
      expect(result.code).toBe(1);
      expect(result.output).toContain("Keep ALL API instances stopped");
      expect(result.output).not.toContain("all active sessions were revoked");
      expect(result.output).not.toContain(replacement);
      expect(result.output).not.toContain(databaseUrl);
    } finally {
      await client.unsafe("DROP TRIGGER reject_recovery_delete ON session");
      await client.unsafe("DROP FUNCTION reject_recovery_delete()");
    }
    const repaired = await cli(
      [
        "src/modules/auth/reset-cli.ts",
        "admin@example.test",
        "--maintenance-confirmed",
      ],
      replacement,
    );
    expect(repaired.code).toBe(0);
    expect(await database.select().from(schema.session)).toHaveLength(0);
  });
  it("native reset repairs an orphan credential after native seed account linking failed", async () => {
    const context = await auth.$context;
    const create = context.internalAdapter.linkAccount;
    context.internalAdapter.linkAccount = async () => {
      throw new Error("Injected account failure");
    };
    try {
      await expect(createAdmin("admin@example.test")).rejects.toThrow();
    } finally {
      context.internalAdapter.linkAccount = create;
    }
    expect(await database.select().from(schema.user)).toHaveLength(1);
    expect(await database.select().from(schema.account)).toHaveLength(0);
    await createAdminRecovery(config).reset({
      email: "admin@example.test",
      password: replacement,
      maintenanceConfirmed: true,
    });
    expect(await database.select().from(schema.account)).toHaveLength(1);
    expect((await signIn("admin@example.test", replacement)).status).toBe(200);
  });
});
