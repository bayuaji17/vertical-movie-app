import { describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";
import { createRequestLogger } from "./logger";
import { createContentErrors } from "./errors";
import { ContentError } from "../shared/content-error";

type RecordEntry = {
  timestamp: string;
  level?: string;
  component?: string;
  errorCode?: string;
  event: string;
  requestId: string;
  method: string;
  path: string;
  status?: number;
  durationMs?: number;
};

function capture(
  config: { level: "debug"; format: "json"; bodies: boolean } = {
    level: "debug",
    format: "json",
    bodies: false,
  },
) {
  const lines: string[] = [];
  const records: RecordEntry[] = [];
  const listeners = new Set<() => void>();
  return {
    config,
    lines,
    records,
    write(line: string) {
      lines.push(line);
      records.push(JSON.parse(line));
      for (const listener of listeners) listener();
    },
    async completed(count = 1) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          listeners.delete(check);
          reject(new Error("Timed out waiting for request completion logs"));
        }, 1000);
        const check = () => {
          if (
            records.filter((r) => r.event === "http.response").length >= count
          ) {
            clearTimeout(timer);
            listeners.delete(check);
            resolve();
          }
        };
        listeners.add(check);
        check();
      });
      // Flush any additional queued hooks to detect duplicate completions.
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(records.filter((r) => r.event === "http.response")).toHaveLength(
        count,
      );
    },
  };
}

const request = (path: string, init?: RequestInit) =>
  new Request("http://localhost" + path, init);

describe("console request logger", () => {
  it("logs immediately, correlates completion, and uses the monotonic clock", async () => {
    const log = capture();
    let clock = 10;
    const handler = Promise.withResolvers<string>();
    const app = new Elysia()
      .use(
        createRequestLogger({
          ...log,
          now: () => clock,
          timestamp: () => "2026-10-07T00:00:00.000Z",
        }),
      )
      .get("/slow", () => handler.promise);
    const pending = app.handle(request("/slow?token=secret"));
    expect(log.records).toHaveLength(1);
    expect(log.records[0]).toMatchObject({
      event: "http.request",
      method: "GET",
      path: "/slow",
    });
    clock = 28.126;
    handler.resolve("done");
    const response = await pending;
    expect(await response.text()).toBe("done");
    await log.completed();
    expect(log.records[1]).toMatchObject({
      level: "info",
      component: "api",
      event: "http.response",
      requestId: log.records[0].requestId,
      method: "GET",
      path: "/slow",
      status: 200,
      durationMs: 18.13,
      responseBytes: 4,
    });
    expect(log.records[0]).toMatchObject({ query: { token: "[redacted]" } });
    expect(log.records[0].requestId).toMatch(
      /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/,
    );
    expect(response.headers.get("x-request-id")).toBe(log.records[0].requestId);
  });

  it("reports the actual status for regular, custom, Response and early results", async () => {
    const log = capture();
    const app = new Elysia()
      .use(createRequestLogger(log))
      .get("/plain", () => "ok")
      .post("/created", ({ status }) => status(201, "created"))
      .get("/no-content", () => new Response(null, { status: 204 }))
      .get(
        "/redirect",
        () =>
          new Response(null, { status: 302, headers: { location: "/plain" } }),
      )
      .get("/set", ({ set }) => {
        set.status = "Forbidden";
        return "no";
      })
      .get("/override", ({ set }) => {
        set.status = 202;
        return new Response("accepted", { status: 200 });
      })
      .get("/early", () => "unreachable", {
        beforeHandle: ({ status }) => status(401, "no"),
      })
      .get("/unavailable", ({ status }) => status(503, "unavailable"));
    const cases: [string, number, string?][] = [
      ["/plain", 200],
      ["/created", 201, "POST"],
      ["/no-content", 204],
      ["/redirect", 302],
      ["/set", 403],
      ["/override", 202],
      ["/early", 401],
      ["/unavailable", 503],
      ["/missing", 404],
    ];
    for (const [path, expected, method] of cases) {
      const response = await app.handle(
        request(path, { method: method ?? "GET" }),
      );
      expect(response.status).toBe(expected);
    }
    await log.completed(cases.length);
    for (const [path, expected] of cases) {
      expect(
        log.records.find((r) => r.path === path && r.event === "http.response")
          ?.status,
      ).toBe(expected);
    }
  });

  it("covers nested plugins, handled domain/parse/validation errors and unhandled errors once", async () => {
    const log = capture();
    const nested = new Elysia()
      .use(createContentErrors())
      .get("/conflict", () => {
        throw new ContentError("CONFLICT", "conflict", 409);
      })
      .get("/handled", () => {
        throw new Error("private failure");
      })
      .post("/validated", ({ body }) => body, {
        body: t.Object({ name: t.String() }),
      });
    const app = new Elysia()
      .use(createRequestLogger(log))
      .use(new Elysia().use(nested))
      .get("/unhandled", () => {
        throw new Error("private stack");
      });
    const cases: [Request, number][] = [
      [request("/conflict"), 409],
      [request("/handled"), 500],
      [request("/unhandled"), 500],
      [
        request("/validated", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
        422,
      ],
      [
        request("/validated", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
        422,
      ],
    ];
    for (const [input, status] of cases)
      expect((await app.handle(input)).status).toBe(status);
    await log.completed(cases.length);
    expect(
      log.records
        .filter((r) => r.event === "http.response")
        .map((r) => r.status),
    ).toEqual(cases.map(([, s]) => s));
    const text = log.lines.join("\n");
    const errors = log.records.filter((r) => r.event === "http.error");
    expect(errors.map((r) => [r.errorCode, r.level])).toEqual([
      ["CONFLICT", "warn"],
      ["INTERNAL_ERROR", "error"],
      ["INTERNAL_ERROR", "error"],
      ["VALIDATION_ERROR", "info"],
      ["VALIDATION_ERROR", "info"],
    ]);
    expect(text).toContain("private failure");
    expect(text).toContain('"stack"');
    // Validation messages embed the submitted input and are never logged.
    expect(text).not.toContain("Expected string");
    expect(text).not.toContain('"found"');
    expect(
      log.records.find((r) => r.event === "http.response" && r.status === 409),
    ).toMatchObject({ errorCode: "CONFLICT" });
  });

  it("isolates concurrent requests and separate instances", async () => {
    const first = capture(),
      second = capture();
    const gate = Promise.withResolvers<string>();
    const app = new Elysia()
      .use(createRequestLogger(first))
      .get("/slow", () => gate.promise)
      .get("/fast", () => "fast");
    const other = new Elysia()
      .use(createRequestLogger(second))
      .get("/fast", () => "other");
    const slow = app.handle(request("/slow"));
    await Promise.all([
      app.handle(request("/fast")),
      other.handle(request("/fast")),
    ]);
    await first.completed(1);
    gate.resolve("slow");
    await slow;
    await first.completed(2);
    await second.completed();
    const starts = [...first.records, ...second.records].filter(
      (r) => r.event === "http.request",
    );
    expect(new Set(starts.map((r) => r.requestId)).size).toBe(3);
    for (const log of [first, second])
      for (const start of log.records.filter(
        (r) => r.event === "http.request",
      )) {
        expect(
          log.records.find(
            (r) =>
              r.event === "http.response" && r.requestId === start.requestId,
          )?.path,
        ).toBe(start.path);
      }
    expect(
      first.records
        .filter((r) => r.event === "http.response")
        .map((r) => r.path),
    ).toEqual(["/fast", "/slow"]);
  });

  it("uses only metadata, leaves streams readable and bounds encoded paths", async () => {
    const log = capture();
    const secret = "DO_NOT_LOG_SECRET";
    const app = new Elysia()
      .use(createRequestLogger(log))
      .post(
        "/login",
        async ({ request }) =>
          new Response(await request.text(), { status: 200 }),
        { parse: "none" },
      );
    const response = await app.handle(
      request("/login?token=" + secret, {
        method: "POST",
        headers: {
          cookie: secret,
          authorization: "Bearer " + secret,
          "x-request-id": secret,
        },
        body: JSON.stringify({
          password: secret,
          url: "https://storage.invalid/?signature=" + secret,
        }),
      }),
    );
    expect(await response.text()).toContain(secret);
    const longPath = "/%0A%0D" + "a".repeat(600);
    expect((await app.handle(request(longPath))).status).toBe(404);
    await log.completed(2);
    expect(log.lines.join("\n")).not.toContain(secret);
    for (const line of log.lines) expect(line.split("\n")).toHaveLength(1);
    expect(
      log.records.find((r) => r.event === "http.request" && r.path !== "/login")
        ?.path,
    ).toBe(longPath.slice(0, 500) + "…");
    expect(Object.keys(log.records[0]).sort()).toEqual([
      "component",
      "event",
      "level",
      "method",
      "path",
      "query",
      "requestId",
      "timestamp",
    ]);
    const streaming = new Elysia().use(createRequestLogger(log)).get(
      "/stream",
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(secret));
              controller.close();
            },
          }),
        ),
    );
    expect(await (await streaming.handle(request("/stream"))).text()).toBe(
      secret,
    );
    await log.completed(3);
    expect(log.lines.join("\n")).not.toContain(secret);
  });

  it("keeps HTTP unchanged when synchronous or asynchronous sinks fail", async () => {
    for (const asynchronous of [false, true]) {
      let writes = 0;
      const completion = Promise.withResolvers<void>();
      const app = new Elysia()
        .use(
          createRequestLogger({
            config: { level: "debug", format: "json", bodies: false },
            write: () => {
              writes++;
              if (writes === 2) completion.resolve();
              if (asynchronous) return Promise.reject(new Error("sink failed"));
              throw new Error("sink failed");
            },
          }),
        )
        .get("/", () => "ok");
      const response = await app.handle(request("/"));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("ok");
      await completion.promise;
      expect(writes).toBe(2);
    }
  });
});

describe("request ids, response details and optional bodies", () => {
  const id = "3f2b8c1e-0d4a-4b7e-9a51-6c2d7e8f9a10";
  const noBodies = { level: "debug", format: "json", bodies: false } as const;
  const withBodies = { ...noBodies, bodies: true } as const;

  it("reuses a valid UUID x-request-id, replaces anything else and echoes it on every response", async () => {
    const log = capture();
    const app = new Elysia()
      .use(createRequestLogger(log))
      .get("/ok", () => "ok")
      .get("/custom", () => new Response("x", { status: 201 }));
    const reused = await app.handle(
      request("/ok", { headers: { "x-request-id": id } }),
    );
    expect(reused.headers.get("x-request-id")).toBe(id);
    const replaced = await app.handle(
      request("/ok", { headers: { "x-request-id": "forged value" } }),
    );
    expect(replaced.headers.get("x-request-id")).not.toBe("forged value");
    expect(replaced.headers.get("x-request-id")).toMatch(/^[\da-f-]{36}$/);
    const custom = await app.handle(request("/custom"));
    expect(custom.status).toBe(201);
    expect(custom.headers.get("x-request-id")).toBeTruthy();
    const missing = await app.handle(request("/nope"));
    expect(missing.status).toBe(404);
    expect(missing.headers.get("x-request-id")).toBeTruthy();
    await log.completed(4);
    expect(log.records.find((r) => r.event === "http.request")?.requestId).toBe(
      id,
    );
  });

  it("records query, sizes and levels per status without leaking secrets", async () => {
    const log = capture();
    const app = new Elysia()
      .use(createRequestLogger(log))
      .post("/upload", () => ({ ok: true }));
    await app.handle(
      request("/upload?page=2&token=abc&X-Amz-Signature=sig", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "12",
          cookie: "session=secret",
          authorization: "Bearer secret",
          "user-agent": "test-agent",
        },
        body: '{"a":"bbbb"}',
      }),
    );
    await log.completed();
    const [req, res] = log.records;
    expect(req).toMatchObject({
      level: "info",
      query: {
        page: "2",
        token: "[redacted]",
        "X-Amz-Signature": "[redacted]",
      },
      contentType: "application/json",
      requestBytes: 12,
      userAgent: "test-agent",
    });
    expect(res).toMatchObject({
      level: "info",
      status: 200,
      responseBytes: 11,
    });
    expect(log.lines.join("\n")).not.toMatch(/secret|abc|sig"/);
  });

  it("logs redacted, bounded JSON bodies only when enabled and never for private routes", async () => {
    const off = capture(noBodies);
    const on = capture(withBodies);
    const routes = (log: ReturnType<typeof capture>) =>
      new Elysia()
        .use(createRequestLogger(log))
        .post("/items", ({ body }) => ({ saved: body, password: "p-resp" }))
        .post("/api/auth/sign-in", ({ body }) => ({ token: "t", body }))
        .post("/admin/media/uploads", ({ body }) => body);
    const send = (
      app: ReturnType<typeof routes>,
      path: string,
      body: unknown,
    ) =>
      app.handle(
        request(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    const quiet = routes(off);
    await send(quiet, "/items", { name: "film", password: "p-req" });
    await off.completed();
    expect(off.records.some((r) => r.event === "http.body")).toBe(false);

    const app = routes(on);
    await send(app, "/items", {
      name: "film",
      password: "p-req",
      a: "x".repeat(900),
      b: "y".repeat(900),
      c: "z".repeat(900),
      d: "w".repeat(900),
      e: "v".repeat(900),
    });
    await send(app, "/api/auth/sign-in", {
      email: "a@b.c",
      password: "p-auth",
    });
    await send(app, "/admin/media/uploads", { part: "etag" });
    await on.completed(3);
    const bodies = on.records.filter((r) => r.event === "http.body") as Array<
      RecordEntry & { direction: string; body: string; truncated: boolean }
    >;
    expect(bodies.map((b) => b.direction)).toEqual(["request", "response"]);
    expect(bodies[0]!.truncated).toBe(true);
    expect(bodies[0]!.body.length).toBeLessThanOrEqual(2048);
    expect(bodies[0]!.body).toContain("film");
    expect(on.lines.join("\n")).not.toMatch(/p-req|p-resp|p-auth|etag|a@b\.c/);
  });
});
