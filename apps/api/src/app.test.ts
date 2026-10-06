import { describe, expect, it } from "bun:test";

import { createApp } from "./app";
import { CatalogService } from "./modules/catalog/service";
import { PlaybackService } from "./modules/playback/service";

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
    [
      "POST",
      "/admin/media/uploads",
      {
        ownerType: "video",
        ownerId: id,
        kind: "source",
        filename: "movie.mp4",
        contentType: "video/mp4",
        sizeBytes: "100",
        idempotencyKey: id,
      },
    ],
    ["GET", "/admin/media/uploads/" + id],
    ["POST", "/admin/media/uploads/" + id + "/parts", { partNumber: 1 }],
    ["POST", "/admin/media/uploads/" + id + "/complete"],
    ["POST", "/admin/media/uploads/" + id + "/abort"],
    [
      "POST",
      "/admin/videos/" + id + "/publish",
      { expectedVersion: 1, idempotencyKey: id },
    ],
    [
      "POST",
      "/admin/series/" + id + "/publish",
      { expectedVersion: 1, idempotencyKey: id },
    ],
    ["GET", "/admin/videos/" + id + "/playback"],
    ["GET", "/admin/videos/" + id + "/hls/master.m3u8"],
    ["GET", "/admin/videos/" + id + "/hls/variants/0"],
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

it("logs every route family, auth Responses and mapped errors without changing HTTP", async () => {
  const records: {
    event: string;
    requestId: string;
    path: string;
    status?: number;
    durationMs?: number;
  }[] = [];
  let completion = Promise.withResolvers<void>();
  class EmptyCatalog extends CatalogService {
    override async list() {
      return { items: [], nextCursor: null };
    }
  }
  class FixturePlayback extends PlaybackService {
    override async playlist() {
      return new Response("#EXTM3U\n");
    }
  }
  const app = createApp({
    requestLogger: {
      write(line) {
        const record = JSON.parse(line);
        records.push(record);
        if (record.event === "http.response") completion.resolve();
      },
    },
    getSession: async () => null,
    catalogService: new EmptyCatalog(),
    playbackService: new FixturePlayback(),
    auth: {
      handler: async (input) => {
        if (input.method === "POST")
          return Response.json({ error: "fixture rejection" }, { status: 401 });
        return Response.json(
          { fixture: true },
          {
            status: 201,
            headers: { "set-cookie": "fixture=secret; HttpOnly" },
          },
        );
      },
    },
  });
  const cases: [string, number, RequestInit?][] = [
    ["/", 200],
    ["/api/auth/get-session", 201],
    ["/api/auth/sign-in/email", 401, { method: "POST" }],
    ["/api/auth/sign-up/email", 404, { method: "POST" }],
    ["/admin/videos", 401],
    ["/admin/media/uploads/" + crypto.randomUUID(), 401],
    [
      "/admin/videos",
      422,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    ],
    ["/videos", 200],
    ["/videos/missing", 503],
    ["/playback/videos/fixture/master.m3u8", 200],
    ["/openapi", 200],
    ["/openapi/json", 200],
    ["/unknown", 404],
  ];
  for (const [path, expected, init] of cases) {
    completion = Promise.withResolvers<void>();
    const from = records.length;
    const response = await app.handle(
      new Request("http://localhost" + path, init),
    );
    expect(response.status).toBe(expected);
    if (path === "/api/auth/get-session")
      expect(response.headers.get("set-cookie")).toBe(
        "fixture=secret; HttpOnly",
      );
    if (path.startsWith("/admin/"))
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    if (path === "/videos") {
      expect(await response.json()).toEqual({ items: [], nextCursor: null });
      expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    }
    if (path.includes("master.m3u8"))
      expect(await response.text()).toBe("#EXTM3U\n");
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "No completion for " +
                path +
                ": " +
                JSON.stringify(records.slice(from)),
            ),
          ),
        1000,
      );
      void completion.promise.then(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    const pair = records.slice(from);
    expect(pair).toHaveLength(2);
    expect(pair[0]).toMatchObject({ event: "http.request", path });
    expect(pair[1]).toMatchObject({
      event: "http.response",
      path,
      status: response.status,
      requestId: pair[0].requestId,
    });
    expect(pair[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(response.headers.has("x-request-id")).toBe(false);
  }
  expect(JSON.stringify(records)).not.toContain("secret");
});

it("logs the admin guard's forbidden and dependency failures with their final status", async () => {
  for (const forbidden of [true, false]) {
    const completion = Promise.withResolvers<number>();
    const app = createApp({
      requestLogger: {
        write(line) {
          const record = JSON.parse(line);
          if (record.event === "http.response")
            completion.resolve(record.status);
        },
      },
      getSession: async () => {
        if (!forbidden) throw new Error("private dependency details");
        return {
          user: {
            id: "fixture",
            name: "User",
            email: "fixture@example.test",
            role: "user",
            banned: false,
          },
          session: { expiresAt: new Date(Date.now() + 60_000) },
        };
      },
    });
    const response = await app.handle(
      new Request("http://localhost/admin/videos"),
    );
    expect(response.status).toBe(forbidden ? 403 : 503);
    expect(await completion.promise).toBe(response.status);
    expect(await response.text()).not.toContain("private dependency details");
  }
});
