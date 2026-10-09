import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createAdminAuthServer } from "@repo/auth/server";
import { createSettingsFixture } from "./site-settings-fixture";
import { SettingsService } from "../../src/modules/settings/service";
import { createApp } from "../../src/app";
import { user, session } from "../../src/db/schema";
let fixture: Awaited<ReturnType<typeof createSettingsFixture>>,
  app: ReturnType<typeof createApp>,
  cookie: string,
  ordinaryCookie: string,
  adminId: string;
const origin = "http://localhost:3000",
  password = "settings-test-password-2026";
const request = (path: string, sessionCookie = cookie, body?: unknown) =>
  app.handle(
    new Request(origin + path, {
      method: body ? "PATCH" : "GET",
      headers: {
        cookie: sessionCookie,
        origin,
        "content-type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
beforeAll(async () => {
  fixture = await createSettingsFixture();
  await fixture.db
    .update(user)
    .set({ role: "user" })
    .where(eq(user.id, "content-admin"));
  const auth = createAdminAuthServer({
    database: fixture.db,
    origin,
    secret: "settings-native-test-secret-no-production-use",
    secureCookies: false,
  });
  const admin = await auth.api.createUser({
    body: {
      email: "settings-admin@example.test",
      name: "Settings Admin",
      password,
      role: "admin",
    },
  });
  adminId = admin.user.id;
  await auth.api.createUser({
    body: {
      email: "settings-user@example.test",
      name: "Settings User",
      password,
      role: "user",
    },
  });
  app = createApp({
    auth,
    getSession: (input) => auth.api.getSession(input),
    settingsService: fixture.service,
  });
  async function login(email: string) {
    const response = await app.handle(
      new Request(origin + "/api/auth/sign-in/email", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(response.status).toBe(200);
    return response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
  }
  cookie = await login("settings-admin@example.test");
  ordinaryCookie = await login("settings-user@example.test");
}, 30000);
afterAll(async () => {
  await fixture?.close();
});
test("100 real cold reads share one SQL SELECT; warm public/private reads, Save prime and fresh bypass are counted", async () => {
  fixture.statements.length = 0;
  const cold = await Promise.all(
    Array.from({ length: 100 }, () => request("/site-settings", "")),
  );
  expect(cold.every((response) => response.status === 200)).toBe(true);
  expect(fixture.reads()).toBe(1);
  const initial = await cold[0]!.json();
  await Promise.all(
    Array.from({ length: 20 }, () => request("/site-settings", "")),
  );
  expect((await request("/admin/settings")).status).toBe(200);
  expect(fixture.reads()).toBe(1);
  const saved = await request("/admin/settings", cookie, {
    ...initial.item,
    siteName: "SQL Brand",
    expectedVersion: initial.version,
  });
  expect(saved.status).toBe(200);
  expect(fixture.writes()).toBe(1);
  expect(fixture.reads()).toBe(1);
  const publicSaved = await (await request("/site-settings", "")).json();
  expect(publicSaved.item.siteName).toBe("SQL Brand");
  expect(publicSaved.version).toBe(2);
  expect(publicSaved).not.toHaveProperty("updatedAt");
  expect(publicSaved.item).not.toHaveProperty("rowVersion");
  expect(fixture.reads()).toBe(1);
  expect((await request("/admin/settings?fresh=1")).status).toBe(200);
  expect(fixture.reads()).toBe(2);
  fixture.advance(3_600_001);
  await Promise.all(
    Array.from({ length: 100 }, () => request("/site-settings", "")),
  );
  expect(fixture.reads()).toBe(3);
});
test("native cookies are authoritative despite warm settings cache; anonymous/user/banned/expired writes cannot change SQL", async () => {
  const current = await fixture.service.read();
  const { rowVersion, updatedAt: _updatedAt, ...fields } = current;
  const input = {
    ...fields,
    siteName: "Forbidden",
    expectedVersion: rowVersion,
  };
  const beforeWrites = fixture.writes();
  for (const [token, status] of [
    ["", 401],
    [ordinaryCookie, 403],
  ] as const) {
    expect((await request("/admin/settings", token)).status).toBe(status);
    expect((await request("/admin/settings", token, input)).status).toBe(
      status,
    );
  }
  await fixture.db
    .update(user)
    .set({ banned: true })
    .where(eq(user.id, adminId));
  expect((await request("/admin/settings", cookie, input)).status).toBe(403);
  await fixture.db
    .update(user)
    .set({ banned: false })
    .where(eq(user.id, adminId));
  await fixture.db
    .update(session)
    .set({ expiresAt: new Date(0) })
    .where(eq(session.userId, adminId));
  expect((await request("/admin/settings", cookie, input)).status).toBe(401);
  expect(fixture.writes()).toBe(beforeWrites);
  expect((await fixture.service.read()).siteName).toBe("SQL Brand");
  expect((await request("/site-settings", "")).status).toBe(200);
});
test("real Bun SQL CAS accepts one concurrent writer and survives service restart", async () => {
  const initial = await fixture.service.read();
  const { rowVersion, updatedAt, ...fields } = initial;
  expect(Date.parse(updatedAt)).toBeGreaterThan(0);
  const results = await Promise.allSettled(
    ["One", "Two"].map((siteName) =>
      fixture.service.save({
        ...fields,
        siteName,
        expectedVersion: rowVersion,
      }),
    ),
  );
  expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((x) => x.status === "rejected")).toHaveLength(1);
  const stored = await new SettingsService(fixture.repository).read();
  expect(stored.rowVersion).toBe(rowVersion + 1);
  expect(["One", "Two"]).toContain(stored.siteName);
  console.log(
    "Settings SQL proof: cold100=1 SELECT; warm/committed Save=0 refill; fresh/expired=1 each; native auth blocked writes; CAS/restart passed.",
  );
});
