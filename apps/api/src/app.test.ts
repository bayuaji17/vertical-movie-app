import { describe, expect, it } from "bun:test";

import { createApp } from "./app";

describe("createApp", () => {
  it("serves the public starter route without opening a port", async () => {
    const response = await createApp().handle(new Request("http://localhost/"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello Elysia");
  });
});

it("keeps private business routes fail-closed and strict while public root remains available", async () => {
  const app = createApp({ getSession: async () => null });
  const id = Bun.randomUUIDv7();
  const routes: [string, string, object?][] = [
    ["POST", "/admin/series", { title: "Series" }],
    ["GET", "/admin/series"],
    ["GET", "/admin/series/" + id],
    ["PATCH", "/admin/series/" + id, { expectedVersion: 1, title: "Title" }],
    ["POST", "/admin/series/" + id + "/seasons", { seasonNumber: 2 }],
    ["GET", "/admin/series/" + id + "/seasons"],
    ["PATCH", "/admin/seasons/" + id, { expectedVersion: 1, title: "Title" }],
    ["POST", "/admin/genres", { name: "Drama" }],
    ["GET", "/admin/genres"],
    ["POST", "/admin/videos", { kind: "movie", title: "Movie" }],
    ["GET", "/admin/videos"],
    ["GET", "/admin/videos/" + id],
    ["PATCH", "/admin/videos/" + id, { expectedVersion: 1, title: "Title" }],
    ["POST", "/admin/videos/" + id + "/archive", { expectedVersion: 1 }],
    ["POST", "/admin/series/" + id + "/archive", { expectedVersion: 1 }],
    ["POST", "/admin/seasons/" + id + "/archive", { expectedVersion: 1 }],
  ];
  for (const [method, path, body] of routes) {
    const r = await app.handle(
      new Request("http://localhost" + path, {
        method,
        ...(body
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      }),
    );
    expect(r.status).toBe(401);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  }
  const invalid = await app.handle(
    new Request("http://localhost/admin/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "movie",
        title: "Movie",
        publicationStatus: "published",
      }),
    }),
  );
  expect(invalid.status).toBe(422);
  expect(
    (await createApp().handle(new Request("http://localhost/admin/videos")))
      .status,
  ).toBe(503);
});

it("documents business routes with cookie security and keeps root public", async () => {
  const response = await createApp().handle(
    new Request("http://localhost/openapi/json"),
  );
  expect(response.status).toBe(200);
  const doc = await response.json();
  expect(doc.paths["/admin/videos"].post.operationId).toBe("createVideo");
  expect(doc.paths["/admin/videos"].post.security).toEqual([
    { betterAuthSessionCookie: [] },
  ]);
  expect(doc.components.securitySchemes.betterAuthSessionCookie.in).toBe(
    "cookie",
  );
  expect(doc.paths["/"].get.security ?? []).toEqual([]);
  const ids: string[] = [];
  for (const path of Object.values(doc.paths)) {
    for (const operation of Object.values(
      path as Record<string, { operationId?: string }>,
    )) {
      if (operation.operationId) ids.push(operation.operationId);
    }
  }
  expect(new Set(ids).size).toBe(ids.length);
});
