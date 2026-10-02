import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import {
  auth,
  client,
  database,
  resetDatabase,
  clearDatabase,
  createAdmin,
  signIn,
  password,
  apiDirectory,
  childEnv,
  databaseUrl,
} from "./operator-fixture";
import * as schema from "../../src/db/schema";

async function nativeCli(email: string, value = password) {
  let output = "";
  let sent = false;
  const child = Bun.spawn(
    [process.execPath, "run", "src/modules/auth/provision-cli.ts", email],
    {
      cwd: apiDirectory,
      env: { ...childEnv, NO_COLOR: "1" },
      terminal: {
        cols: 100,
        rows: 30,
        data(terminal, data) {
          output += new TextDecoder().decode(data);
          if (!sent && output.includes("Admin password")) {
            sent = true;
            // Give prompts time to install its raw-mode input listener.
            setTimeout(() => terminal.write(value + "\r"), 100);
          }
        },
      },
    },
  );
  const timer = setTimeout(() => child.kill(), 20000);
  try {
    return { code: await child.exited, output };
  } finally {
    clearTimeout(timer);
    child.terminal?.close();
  }
}

describe("native single-admin operator", () => {
  beforeAll(resetDatabase);
  beforeEach(clearDatabase);
  afterAll(() => client.close());
  it("official CLI loads the factory config and uses its hidden password prompt", async () => {
    const result = await nativeCli("native-cli@example.test");
    expect(result.code).toBe(0);
    expect(result.output).toContain("Admin user created successfully.");
    expect(result.output).not.toContain(password);
    expect(result.output).not.toContain(databaseUrl);
    expect(await database.select().from(schema.user)).toHaveLength(1);
    expect(await database.select().from(schema.account)).toHaveLength(1);
    expect(await database.select().from(schema.session)).toHaveLength(0);
    expect((await signIn("native-cli@example.test")).status).toBe(200);
  }, 25000);
  it("an existing admin rejects another native CLI seed without changing its password", async () => {
    await createAdmin("existing@example.test");
    const result = await nativeCli("second@example.test");
    expect(result.code).toBe(1);
    expect(result.output).not.toContain(password);
    expect(result.output).not.toContain(databaseUrl);
    expect(result.output).not.toContain("INSERT INTO");
    expect(await database.select().from(schema.user)).toHaveLength(1);
    expect(await database.select().from(schema.account)).toHaveLength(1);
    expect((await signIn("existing@example.test")).status).toBe(200);
  }, 25000);
  it("concurrent native creation is limited by the database canonical admin constraint", async () => {
    const results = await Promise.allSettled([
      createAdmin("one@example.test"),
      createAdmin("two@example.test"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await database.select().from(schema.user)).toHaveLength(1);
    expect(await database.select().from(schema.account)).toHaveLength(1);
  });
  it("the native CLI creation hook enforces the configured minimum before writing", async () => {
    await expect(
      auth.api.createUser({
        body: {
          email: "short@example.test",
          name: "Admin",
          role: "admin",
          password: "short",
        },
      }),
    ).rejects.toThrow();
    expect(await database.select().from(schema.user)).toHaveLength(0);
  });
});
