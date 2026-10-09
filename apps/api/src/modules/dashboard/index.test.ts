import { expect, test } from "bun:test";
import type { SessionInput } from "@repo/auth/types";
import { createDashboardModule } from "./index";
import { DashboardService } from "./service";
import { createApp } from "../../app";
const admin: SessionInput = {
  user: {
    id: "admin",
    name: "Admin",
    email: "admin@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60000) },
};
const request = (query = "") =>
  new Request(`http://localhost/admin/dashboard/summary${query}`);
test("dashboard guard denies before repository with no-store", async () => {
  for (const [value, status] of [
    [null, 401],
    [{ ...admin, session: { expiresAt: new Date(0) } }, 401],
    [{ ...admin, user: { ...admin!.user, role: "user" } }, 403],
    [{ ...admin, user: { ...admin!.user, banned: true } }, 403],
  ] as const) {
    let reads = 0;
    const app = createDashboardModule({
      getSession: async () => value,
      service: new DashboardService({
        read: async () => {
          reads++;
          throw new Error();
        },
      }),
    });
    const response = await app.handle(request());
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(reads).toBe(0);
  }
});
test("dashboard success and unexpected query validation", async () => {
  let reads = 0;
  const app = createDashboardModule({
    getSession: async () => admin,
    service: new DashboardService({
      read: async () => {
        reads++;
        return {
          generatedAt: new Date(),
          content: [],
          media: [],
          latestContent: [],
          failedMedia: [],
        };
      },
    }),
  });
  const response = await app.handle(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).latestContent).toEqual([]);
  for (const query of ["?type=film", "?page=1", "?secret=value"]) {
    const res = await app.handle(request(query));
    expect(res.status).toBe(422);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(reads).toBe(1);
});
test("dashboard unconfigured/database/auth failures are safe503", async () => {
  for (const app of [
    createDashboardModule({ getSession: async () => admin }),
    createDashboardModule({
      getSession: async () => admin,
      service: new DashboardService({
        read: async () => {
          throw Error("secret-connection");
        },
      }),
    }),
    createDashboardModule({
      getSession: async () => {
        throw Error("secret-connection");
      },
    }),
  ]) {
    const res = await app.handle(request());
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.text()).not.toContain("secret-connection");
  }
});
test("static app documents the dashboard while keeping public routes available", async () => {
  const app = createApp();
  const response = await app.handle(
    new Request("http://localhost/openapi/json"),
  );
  const schema = await response.json();
  expect(schema.paths["/admin/dashboard/summary"].get.operationId).toBe(
    "getAdminDashboardSummary",
  );
  expect(schema.paths["/admin/dashboard/summary"].get.security).toEqual([
    { betterAuthSessionCookie: [] },
  ]);
  expect((await app.handle(new Request("http://localhost/"))).status).toBe(200);
});
