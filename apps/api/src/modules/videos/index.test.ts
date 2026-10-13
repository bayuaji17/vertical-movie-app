import { test, expect } from "bun:test";
import { createVideosModule } from "./index";
import { VideosService } from "./service";
test("video create never calls service without admin", async () => {
  let calls = 0;
  const service = new VideosService();
  service.create = async () => {
    calls++;
    throw new Error("Forbidden");
  };
  const app = createVideosModule({ service, getSession: async () => null });
  const response = await app.handle(
    new Request("http://localhost/admin/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "movie", title: "Movie" }),
    }),
  );
  expect(response.status).toBe(401);
  expect(calls).toBe(0);
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
  series: 0,
  seasons: 0,
  videos: 1,
  assets: 0,
  uploadSessions: 0,
  jobs: 0,
  storageObjects: 0,
};
const del = (path: string) =>
  new Request("http://localhost" + path, { method: "DELETE" });

test("video delete requires an admin, an expected version and returns the removal summary", async () => {
  const calls: unknown[][] = [];
  const service = new VideosService();
  service.remove = async (...args) => {
    calls.push(args);
    return { id, kind: "movie", removed };
  };
  const anonymous = createVideosModule({
    service,
    getSession: async () => null,
  });
  expect(
    (await anonymous.handle(del(`/admin/videos/${id}?expectedVersion=2`)))
      .status,
  ).toBe(401);
  expect(calls).toHaveLength(0);

  const app = createVideosModule({ service, getSession: async () => admin });
  for (const query of [
    "",
    "?expectedVersion=0",
    "?expectedVersion=abc",
    "?expectedVersion=2&force=1",
  ])
    expect((await app.handle(del(`/admin/videos/${id}${query}`))).status).toBe(
      422,
    );
  expect(
    (await app.handle(del("/admin/videos/not-a-uuid?expectedVersion=2")))
      .status,
  ).toBe(422);
  expect(calls).toHaveLength(0);

  const response = await app.handle(
    del(`/admin/videos/${id}?expectedVersion=2`),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id, kind: "movie", removed });
  expect(calls).toEqual([[id, 2, "del-admin"]]);
});
