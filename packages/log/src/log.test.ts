import { expect, test } from "bun:test";
import {
  createLogger,
  errorFields,
  isRequestId,
  loadLogEnv,
  redact,
  redactQuery,
  redactText,
  requestIdFrom,
} from "./index";
import type { LogConfig } from "./index";

const json: LogConfig = { level: "debug", format: "json", bodies: false };
function capture(config: LogConfig = json) {
  const lines: string[] = [];
  const log = createLogger("test", {
    config,
    write: (l) => void lines.push(l),
    timestamp: () => "2026-10-11T00:00:00.000Z",
    color: false,
  });
  return { log, lines };
}

test("json lines carry timestamp, level, component and fields; undefined is dropped", () => {
  const { log, lines } = capture();
  log.info("job.claimed", { jobId: "j1", attempt: 2, skipped: undefined });
  expect(JSON.parse(lines[0]!)).toEqual({
    timestamp: "2026-10-11T00:00:00.000Z",
    level: "info",
    component: "test",
    event: "job.claimed",
    jobId: "j1",
    attempt: 2,
  });
});
test("level filters events and child adds fields to every event", () => {
  const { log, lines } = capture({ ...json, level: "warn" });
  log.debug("a");
  log.info("b");
  log.child({ jobId: "j1" }).warn("c", { x: 1 });
  log.error("d");
  expect(lines.map((l) => JSON.parse(l).event)).toEqual(["c", "d"]);
  expect(JSON.parse(lines[0]!).jobId).toBe("j1");
  expect(log.enabled("info")).toBe(false);
});
test("pretty format is one readable line with the same fields", () => {
  const { log, lines } = capture({ ...json, format: "pretty" });
  log.warn("http.error", { status: 409, message: "two words" });
  expect(lines).toEqual([
    '00:00:00.000 WARN  test http.error status=409 message="two words"',
  ]);
});
test("sensitive keys, signed URLs and long text never reach the output", () => {
  const { log, lines } = capture();
  log.info("x", {
    password: "p",
    cookie: "a=b",
    authorization: "Bearer abc",
    leaseToken: "t",
    nested: { apiKey: "k", ok: 1 },
    url: "https://s3.test/o?X-Amz-Signature=abc&X-Amz-Credential=c&keep=1",
    long: "x".repeat(2000),
  });
  const out = lines[0]!;
  for (const secret of [
    '"p"',
    "a=b",
    "Bearer",
    '"t"',
    '"k"',
    "=abc",
    "X-Amz-Credential=c",
  ])
    expect(out).not.toContain(secret);
  expect(out).toContain("keep=1");
  expect(out).toContain("[redacted]");
  expect(JSON.parse(out).long.length).toBeLessThanOrEqual(502);
});
test("redact bounds depth and array size and tolerates odd values", () => {
  const circular: Record<string, unknown> = {};
  circular.self = { deeper: { deepest: { gone: { x: 1 } } } };
  expect(JSON.stringify(redact(circular))).toContain("[truncated]");
  const big = redact(Array.from({ length: 50 }, (_, i) => i)) as unknown[];
  expect(big.length).toBe(21);
  expect(redact(() => 1)).toBeUndefined();
  expect(redact(10n)).toBe("10");
  expect(redactText("a?token=1&b=2")).toBe("a?token=[redacted]&b=2");
});
test("query parameters are masked by name and values are bounded", () => {
  const q = redactQuery(
    new URLSearchParams(
      "page=1&token=abc&X-Amz-Signature=s&q=" + "y".repeat(400),
    ),
  );
  expect(q.page).toBe("1");
  expect(q.token).toBe("[redacted]");
  expect(q["X-Amz-Signature"]).toBe("[redacted]");
  expect(q.q!.length).toBeLessThanOrEqual(200);
});
test("error fields keep name, message, code and a short cause chain; stack only on request", () => {
  const cause = new Error("db down?password=secret123");
  const error = new Error("outer", { cause });
  const plain = errorFields(error);
  expect(plain.name).toBe("Error");
  expect(JSON.stringify(plain)).not.toContain("stack");
  expect(JSON.stringify(plain)).toContain("db down");
  expect(errorFields(error, true).stack).toBeInstanceOf(Array);
  expect(errorFields("boom").message).toBe("boom");
  expect(errorFields(undefined).message).toBe("Unknown error");
});
test("a failing or rejecting sink never throws into the caller", async () => {
  const bad = createLogger("t", {
    config: json,
    write: () => {
      throw new Error("sink");
    },
  });
  expect(() => bad.info("x")).not.toThrow();
  const rejecting = createLogger("t", {
    config: json,
    write: () => Promise.reject(new Error("sink")),
  });
  expect(() => rejecting.error("x")).not.toThrow();
  await Promise.resolve();
});
test("log env defaults follow NODE_ENV and invalid values are rejected", () => {
  expect(loadLogEnv({})).toEqual({
    level: "debug",
    format: "pretty",
    bodies: false,
  });
  expect(loadLogEnv({ NODE_ENV: "production" })).toEqual({
    level: "info",
    format: "json",
    bodies: false,
  });
  expect(
    loadLogEnv({
      LOG_LEVEL: "WARN",
      LOG_FORMAT: "json",
      LOG_HTTP_BODIES: "true",
    }),
  ).toEqual({ level: "warn", format: "json", bodies: true });
  expect(() => loadLogEnv({ LOG_LEVEL: "loud" })).toThrow("LOG_LEVEL");
  expect(() => loadLogEnv({ LOG_FORMAT: "xml" })).toThrow("LOG_FORMAT");
  expect(() => loadLogEnv({ LOG_HTTP_BODIES: "yes" })).toThrow(
    "LOG_HTTP_BODIES",
  );
  expect(() =>
    loadLogEnv({ NODE_ENV: "production", LOG_HTTP_BODIES: "true" }),
  ).toThrow("production");
});
test("only UUID request IDs from peers are reused", () => {
  const id = "3f2b8c1e-0d4a-4b7e-9a51-6c2d7e8f9a10";
  expect(isRequestId(id)).toBe(true);
  expect(isRequestId("abc")).toBe(false);
  expect(isRequestId(undefined)).toBe(false);
  expect(requestIdFrom(new Headers({ "x-request-id": id.toUpperCase() }))).toBe(
    id,
  );
  const fresh = requestIdFrom(
    new Headers({ "x-request-id": "not-a-uuid-fake" }),
  );
  expect(isRequestId(fresh)).toBe(true);
  expect(fresh).not.toBe("not-a-uuid-fake");
});
