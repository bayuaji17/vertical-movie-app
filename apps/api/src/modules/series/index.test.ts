import { test, expect } from "bun:test";
import { createSeriesModule } from "./index";
import { SeriesService } from "./service";
test("series routes never call domain service without admin", async () => {
  const service = new SeriesService();
  let called = 0;
  service.create = async () => {
    called++;
    throw new Error("Must not call");
  };
  const app = createSeriesModule({ service, getSession: async () => null });
  const response = await app.handle(
    new Request("http://localhost/admin/series", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Private" }),
    }),
  );
  expect(response.status).toBe(401);
  expect(called).toBe(0);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

const admin = {
  user: {
    id: "del-admin",
    name: "Admin",
    email: "del@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 3600000) },
};
const id = "6f009a09-3d1c-4697-b6d5-3c2ab4c93e4c";
const removed = {
  series: 1,
  seasons: 2,
  videos: 3,
  assets: 4,
  uploadSessions: 4,
  jobs: 4,
  storageObjects: 12,
};
const del = (path: string) =>
  new Request("http://localhost" + path, { method: "DELETE" });

test("series and season delete are admin-only, validate the version and return the summary", async () => {
  const calls: string[] = [];
  const service = new SeriesService();
  service.remove = async (...args) => {
    calls.push("series:" + args.join(","));
    return { id, kind: "series", removed };
  };
  service.removeSeason = async (...args) => {
    calls.push("season:" + args.join(","));
    return { id, kind: "season", removed };
  };
  const anonymous = createSeriesModule({
    service,
    getSession: async () => null,
  });
  expect(
    (await anonymous.handle(del(`/admin/series/${id}?expectedVersion=1`)))
      .status,
  ).toBe(401);
  expect(
    (await anonymous.handle(del(`/admin/seasons/${id}?expectedVersion=1`)))
      .status,
  ).toBe(401);
  expect(calls).toHaveLength(0);

  const app = createSeriesModule({ service, getSession: async () => admin });
  expect((await app.handle(del(`/admin/series/${id}`))).status).toBe(422);
  expect(
    (await app.handle(del(`/admin/seasons/${id}?expectedVersion=x`))).status,
  ).toBe(422);
  expect(calls).toHaveLength(0);

  const series = await app.handle(del(`/admin/series/${id}?expectedVersion=3`));
  expect(series.status).toBe(200);
  expect(await series.json()).toEqual({ id, kind: "series", removed });
  const season = await app.handle(
    del(`/admin/seasons/${id}?expectedVersion=4`),
  );
  expect((await season.json()).kind).toBe("season");
  expect(calls).toEqual([
    `series:${id},3,del-admin`,
    `season:${id},4,del-admin`,
  ]);
});
