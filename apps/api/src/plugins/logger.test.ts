import { describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";
import { createRequestLogger } from "./logger";
import { createContentErrors } from "./errors";
import { ContentError } from "../shared/content-error";

type RecordEntry = {
  timestamp: string;
  event: string;
  requestId: string;
  method: string;
  path: string;
  status?: number;
  durationMs?: number;
};

function capture() {
  const lines: string[] = [];
  const records: RecordEntry[] = [];
  const listeners = new Set<() => void>();
  return {
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
    expect(log.records[1]).toEqual({
      ...log.records[0],
      event: "http.response",
      status: 200,
      durationMs: 18.13,
    });
    expect(log.records[0].requestId).toMatch(
      /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/,
    );
    expect(response.headers.has("x-request-id")).toBe(false);
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
    expect(log.lines.join("\n")).not.toContain("private");
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
    ).toBe(longPath.slice(0, 512));
    expect(Object.keys(log.records[0]).sort()).toEqual([
      "event",
      "method",
      "path",
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
