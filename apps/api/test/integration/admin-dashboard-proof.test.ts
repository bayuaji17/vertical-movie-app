import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "../../src/db/schema";
import { createAdminAuthServer } from "@repo/auth/server";
import { resetContentDatabase } from "./content-fixture";
import { seedDashboard } from "./admin-dashboard-fixture";
import { createDashboardRepository } from "../../src/modules/dashboard/repository";
import { DashboardService } from "../../src/modules/dashboard/service";
import { createApp } from "../../src/app";
import type { ContentDatabase } from "../../src/shared/content-db";
let database: Awaited<ReturnType<typeof resetContentDatabase>>,
  seed: Awaited<ReturnType<typeof seedDashboard>>,
  app: ReturnType<typeof createApp>,
  cookie: string,
  ordinaryCookie: string,
  adminId: string;
const queries: { query: string; params: unknown[] }[] = [];
let service: DashboardService;
const origin = "http://localhost:3000",
  password = "dashboard-test-password-2026";
const request = (path = "/admin/dashboard/summary", sessionCookie = cookie) =>
  app.handle(
    new Request(origin + path, { headers: { cookie: sessionCookie } }),
  );
beforeAll(async () => {
  database = await resetContentDatabase();
  const db = drizzle({
    client: database.client,
    schema,
    logger: {
      logQuery(query, params) {
        queries.push({ query, params });
      },
    },
  });
  service = new DashboardService(createDashboardRepository(db));
  seed = await seedDashboard(database);
  await database.db
    .update(schema.user)
    .set({ role: "user" })
    .where(eq(schema.user.id, "content-admin"));
  const auth = createAdminAuthServer({
    database: database.db,
    origin,
    secret: "dashboard-native-test-secret-no-production-use",
    secureCookies: false,
  });
  const admin = await auth.api.createUser({
    body: {
      email: "dashboard-admin@example.test",
      name: "Dashboard Admin",
      password,
      role: "admin",
    },
  });
  adminId = admin.user.id;
  await auth.api.createUser({
    body: {
      email: "dashboard-user@example.test",
      name: "Dashboard User",
      password,
      role: "user",
    },
  });
  app = createApp({
    auth,
    getSession: (input) => auth.api.getSession(input),
    dashboardService: service,
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
  cookie = await login("dashboard-admin@example.test");
  ordinaryCookie = await login("dashboard-user@example.test");
}, 30000);
afterAll(async () => {
  await database?.client.close();
});
test("real inventory exceeds100, preserves child/editorial/archive/unpublished semantics", async () => {
  const result = await service.summary();
  expect(result.content.film).toEqual({
    total: 125,
    draft: 120,
    published: 2,
    archived: 3,
    unpublished: 0,
  });
  expect(result.content.standalone.total).toBe(12);
  expect(result.content.series).toEqual({
    total: 5,
    draft: 2,
    published: 1,
    archived: 1,
    unpublished: 1,
  });
  expect(result.content.episode).toEqual({
    total: 6,
    draft: 4,
    published: 2,
    archived: 0,
    unpublished: 0,
  });
  expect(result.latestContent.map((row) => row.id)).toEqual(seed.latest);
  expect(result.latestContent.map((row) => row.type).join(",")).not.toContain(
    "episode",
  );
  expect(result.media).toEqual({ queued: 2, running: 2, retry: 2, failed: 7 });
  expect(result.failedMedia.map((row) => row.jobId)).toEqual(
    [...seed.failures].sort().reverse().slice(0, 5),
  );
  expect(JSON.stringify(result)).not.toMatch(
    /private\/|bucket|failureCode|outputPrefix|signature/,
  );
});
test("five reads, no owner N+1, stable ties and bounded result; EXPLAIN uses existing schema", async () => {
  queries.length = 0;
  const first = await service.summary(),
    second = await service.summary();
  expect(first.latestContent).toEqual(second.latestContent);
  expect(first.failedMedia).toEqual(second.failedMedia);
  const reads = queries.filter((row) => /^\s*(SELECT|WITH)/i.test(row.query));
  expect(reads).toHaveLength(10);
  const timings: number[] = [];
  for (const statement of reads.slice(0, 5)) {
    const plan = await database.client.unsafe(
      "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + statement.query,
      statement.params,
    );
    const value = plan[0]["QUERY PLAN"][0];
    expect(value.Plan).toBeDefined();
    expect(value["Execution Time"]).toBeLessThan(1000);
    timings.push(value["Execution Time"]);
  }
  console.log(
    "Dashboard EXPLAIN execution milliseconds (fixture scale):",
    JSON.stringify(timings),
  );
});
test("authorized native cookie returns private summary; guard stops anonymous/nonadmin before data reads", async () => {
  queries.length = 0;
  for (const [token, status] of [
    ["", 401],
    [ordinaryCookie, 403],
  ] as const) {
    const response = await request(undefined, token);
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(queries).toHaveLength(0);
  const response = await request();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).media.failed).toBe(7);
  expect((await request("/admin/dashboard/summary?type=film")).status).toBe(
    422,
  );
});
test("summary read preserves persisted rows", async () => {
  const tables = ["videos", "series", "seasons", "media_assets", "media_jobs"];
  async function hashes() {
    return Promise.all(
      tables.map(
        async (table) =>
          (
            await database.client.unsafe(
              `SELECT md5(coalesce(jsonb_agg(t ORDER BY id)::text,'')) AS hash FROM ${table} t`,
            )
          )[0].hash,
      ),
    );
  }
  const before = await hashes();
  await service.summary();
  expect(await hashes()).toEqual(before);
});
test("repeatable read stays coherent across concurrent owner creation", async () => {
  type Tx = Parameters<Parameters<ContentDatabase["transaction"]>[0]>[0];
  let reads = 0;
  const wrapped = new Proxy(database.db, {
    get(target, key, receiver) {
      if (key !== "transaction") return Reflect.get(target, key, receiver);
      return (
        fn: (tx: Tx) => Promise<unknown>,
        config: Parameters<ContentDatabase["transaction"]>[1],
      ) =>
        target.transaction(
          (tx) =>
            fn(
              new Proxy(tx, {
                get(transaction, property, receiver) {
                  if (property !== "execute")
                    return Reflect.get(transaction, property, receiver);
                  return async (statement: Parameters<Tx["execute"]>[0]) => {
                    const rows = await transaction.execute(statement);
                    if (++reads === 2)
                      await database.client`INSERT INTO videos(id,kind,slug,title,created_by,updated_by) VALUES (${crypto.randomUUID()},'standalone','concurrent-dashboard','Concurrent dashboard','content-admin','content-admin')`;
                    return rows;
                  };
                },
              }),
            ),
          config,
        );
    },
  }) as ContentDatabase;
  const snapshot = await new DashboardService(
    createDashboardRepository(wrapped),
  ).summary();
  expect(snapshot.content.standalone.total).toBe(12);
  expect(snapshot.latestContent.map((row) => row.id)).toEqual(seed.latest);
  expect((await service.summary()).content.standalone.total).toBe(13);
  await database.client`DELETE FROM videos WHERE slug='concurrent-dashboard'`;
});
test("latest ordering resolves same timestamp and ID across owner types", async () => {
  const id = crypto.randomUUID();
  await database.client`INSERT INTO videos(id,kind,slug,title,created_by,updated_by,created_at) VALUES (${id},'movie','dashboard-type-tie','Type tie film','content-admin','content-admin','2050-01-01T00:00:00Z')`;
  await database.client`INSERT INTO series(id,slug,title,created_by,updated_by,created_at) VALUES (${id},'dashboard-type-tie','Type tie series','content-admin','content-admin','2050-01-01T00:00:00Z')`;
  expect(
    (await service.summary()).latestContent
      .slice(0, 2)
      .map((row) => ({ type: row.type, id: row.id })),
  ).toEqual([
    { type: "film", id },
    { type: "series", id },
  ]);
  await database.client`DELETE FROM videos WHERE id=${id}`;
  await database.client`DELETE FROM series WHERE id=${id}`;
});

test("native banned/expired/revoked/auth-outage/closed DB deny safely", async () => {
  await database.db
    .update(schema.user)
    .set({ banned: true })
    .where(eq(schema.user.id, adminId));
  queries.length = 0;
  expect((await request()).status).toBe(403);
  expect(queries).toHaveLength(0);
  await database.db
    .update(schema.user)
    .set({ banned: false })
    .where(eq(schema.user.id, adminId));
  await database.db
    .update(schema.session)
    .set({ expiresAt: new Date(0) })
    .where(eq(schema.session.userId, adminId));
  expect((await request()).status).toBe(401);
  await database.db
    .delete(schema.session)
    .where(eq(schema.session.userId, adminId));
  expect((await request()).status).toBe(401);
  const failed = createApp({
    getSession: async () => {
      throw Error("private auth details");
    },
  });
  const response = await failed.handle(
    new Request(origin + "/admin/dashboard/summary"),
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private auth details");
  await database.client.close();
  await expect(service.summary()).rejects.toMatchObject({
    httpStatus: 503,
    code: "CONTENT_DEPENDENCY_UNAVAILABLE",
  });
});
