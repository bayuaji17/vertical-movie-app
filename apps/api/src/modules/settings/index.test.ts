import { expect, test } from "bun:test";
import { createApp } from "../../app";
import { SettingsService } from "./service";
import { SETTINGS_DEFAULTS } from "./model";
import type { AdminSession } from "../auth/admin/guard";
const admin: AdminSession = {
  user: {
    id: "sset",
    name: "Admin",
    email: "sset@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 3600000) },
};
const row = () => ({
  ...SETTINGS_DEFAULTS,
  rowVersion: 1,
  updatedAt: new Date().toISOString(),
});
const quiet = { write: () => {} };
const req = (path: string, body?: unknown) =>
  new Request("http://localhost" + path, {
    ...(body
      ? {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
test("anonymous public projection ignores failed auth; native private guard remains authoritative on warm cache", async () => {
  let reads = 0,
    writes = 0;
  const service = new SettingsService({
    read: async () => {
      reads++;
      return { ...row(), secret: "hidden" };
    },
    save: async () => {
      writes++;
      return row();
    },
  });
  let session: AdminSession | null = admin;
  const app = createApp({
    settingsService: service,
    requestLogger: quiet,
    getSession: async ({ query }) => {
      expect(query.disableCookieCache).toBe(true);
      return session;
    },
  });
  const data = await (await app.handle(req("/site-settings"))).json();
  expect(Object.keys(data.item)).toEqual(Object.keys(SETTINGS_DEFAULTS));
  expect(data.version).toBe(1);
  expect(reads).toBe(1);
  expect((await app.handle(req("/admin/settings"))).status).toBe(200);
  expect(reads).toBe(1);
  session = null;
  expect((await app.handle(req("/admin/settings"))).status).toBe(401);
  expect(
    (
      await app.handle(
        req("/admin/settings", { ...SETTINGS_DEFAULTS, expectedVersion: 1 }),
      )
    ).status,
  ).toBe(401);
  expect(writes).toBe(0);
  session = { ...admin, user: { ...admin.user, role: "user" } };
  expect((await app.handle(req("/admin/settings"))).status).toBe(403);
  const failed = createApp({
    settingsService: service,
    requestLogger: quiet,
    getSession: async () => {
      throw Error("auth detail");
    },
  });
  expect((await failed.handle(req("/site-settings"))).status).toBe(200);
  expect((await failed.handle(req("/admin/settings"))).status).toBe(503);
});
test("HTTP validates Unicode, strict query/body, no-store, fresh bypass, conflict and dependency errors", async () => {
  let stored = row(),
    reads = 0;
  const service = new SettingsService({
    read: async () => {
      reads++;
      return stored;
    },
    save: async (fields, v) => {
      if (v !== stored.rowVersion) return null;
      stored = { ...fields, rowVersion: v + 1, updatedAt: stored.updatedAt };
      return stored;
    },
  });
  const app = createApp({
    settingsService: service,
    requestLogger: quiet,
    getSession: async () => admin,
  });
  const publicResponse = await app.handle(req("/site-settings"));
  expect(publicResponse.headers.get("cache-control")).toContain("no-store");
  for (const path of [
    "/site-settings?fresh=1",
    "/site-settings?extra=1",
    "/admin/settings?fresh=true",
    "/admin/settings?extra=1",
  ])
    expect((await app.handle(req(path))).status).toBe(422);
  expect((await app.handle(req("/admin/settings?fresh=1"))).status).toBe(200);
  expect(reads).toBe(2);
  expect(
    (
      await app.handle(
        req("/admin/settings", {
          ...SETTINGS_DEFAULTS,
          siteName: "😀".repeat(80),
          expectedVersion: 1,
        }),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await app.handle(
        req("/admin/settings", { ...SETTINGS_DEFAULTS, expectedVersion: 1 }),
      )
    ).status,
  ).toBe(409);
  for (const change of [
    { siteName: "😀".repeat(81) },
    { extra: "secret" },
    { expectedVersion: 0 },
    { description: "new\nline" },
  ])
    expect(
      (
        await app.handle(
          req("/admin/settings", {
            ...SETTINGS_DEFAULTS,
            expectedVersion: 2,
            ...change,
          }),
        )
      ).status,
    ).toBe(422);
  expect(
    (
      await app.handle(
        req("/admin/settings", {
          ...SETTINGS_DEFAULTS,
          description: "x".repeat(17000),
          expectedVersion: 2,
        }),
      )
    ).status,
  ).toBe(422);
  expect(
    (await createApp({ requestLogger: quiet }).handle(req("/site-settings")))
      .status,
  ).toBe(503);
});
