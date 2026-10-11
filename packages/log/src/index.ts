// Structured console logging shared by the API, the media worker and the web
// server. One JSON object per line in production, a compact colored line in
// development. Nothing here may throw into callers: a failing sink or an odd
// value must never change HTTP or job behavior.

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFormat = "json" | "pretty";
export type LogConfig = {
  level: LogLevel;
  format: LogFormat;
  /** Opt-in request/response JSON bodies; never enabled in production. */
  bodies: boolean;
};
export type LogFields = Record<string, unknown>;
export type LogSink = (line: string) => void | Promise<void>;

const order: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
export const requestIdHeader = "x-request-id";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A request ID from a peer is only trusted when it is a UUID. */
export function isRequestId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}
export function requestIdFrom(headers: Headers) {
  const incoming = headers.get(requestIdHeader);
  return isRequestId(incoming) ? incoming.toLowerCase() : crypto.randomUUID();
}

export function loadLogEnv(
  source: Record<string, string | undefined> = process.env,
): LogConfig {
  const production = source.NODE_ENV === "production";
  const level = (
    source.LOG_LEVEL ?? (production ? "info" : "debug")
  ).toLowerCase();
  if (!(level in order))
    throw new Error("LOG_LEVEL harus debug, info, warn atau error.");
  const format = (
    source.LOG_FORMAT ?? (production ? "json" : "pretty")
  ).toLowerCase();
  if (format !== "json" && format !== "pretty")
    throw new Error("LOG_FORMAT harus json atau pretty.");
  const raw = (source.LOG_HTTP_BODIES ?? "false").toLowerCase();
  if (raw !== "true" && raw !== "false")
    throw new Error("LOG_HTTP_BODIES harus true atau false.");
  if (raw === "true" && production)
    throw new Error("LOG_HTTP_BODIES tidak boleh true pada production.");
  return { level: level as LogLevel, format, bodies: raw === "true" };
}

const sensitiveKey =
  /pass(word|wd)?|secret|token|authorization|cookie|signature|credential|api[-_]?key|session|private|x-amz-/i;
const signedParam =
  /^(x-amz-[a-z-]+|signature|token|sig|key|credential|expires)$/i;
const maxString = 500;
const maxItems = 20;
const maxDepth = 4;

/** Mask signed-URL query parameters inside a free-text value. */
export function redactText(value: string) {
  const text = value.replace(
    /([?&])(x-amz-[a-z-]+|signature|token|sig|credential)=[^&\s"']*/gi,
    "$1$2=[redacted]",
  );
  return text.length > maxString ? text.slice(0, maxString) + "…" : text;
}
export function redact(value: unknown, depth = 0, key = ""): unknown {
  if (key && sensitiveKey.test(key)) return "[redacted]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol")
    return undefined;
  if (depth >= maxDepth) return "[truncated]";
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return errorFields(value, false);
  if (Array.isArray(value)) {
    const items = value.slice(0, maxItems).map((v) => redact(v, depth + 1));
    return value.length > maxItems
      ? [...items, `…+${value.length - maxItems}`]
      : items;
  }
  if (value instanceof URLSearchParams) return redactQuery(value);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    let n = 0;
    for (const [k, v] of Object.entries(value)) {
      if (n++ >= maxItems) {
        out["…"] = "truncated";
        break;
      }
      out[k] = redact(v, depth + 1, k);
    }
    return out;
  }
  return undefined;
}
/** Query as an object; sensitive or signed parameters are masked. */
export function redactQuery(params: URLSearchParams) {
  const out: Record<string, string> = {};
  let n = 0;
  for (const [k, v] of params) {
    if (n++ >= maxItems) break;
    out[k] =
      sensitiveKey.test(k) || signedParam.test(k)
        ? "[redacted]"
        : redactText(v).slice(0, 200);
  }
  return out;
}
/** Name, message and a short cause chain; the stack only when asked for. */
export function errorFields(
  error: unknown,
  stack = false,
): Record<string, unknown> {
  const chain: Array<Record<string, unknown>> = [];
  let current: unknown = error;
  for (let i = 0; i < 3 && current !== undefined && current !== null; i++) {
    if (current instanceof Error) {
      const code = (current as { code?: unknown }).code;
      chain.push({
        name: current.name,
        message: redactText(current.message).slice(0, 300),
        ...(typeof code === "string" || typeof code === "number"
          ? { code }
          : {}),
      });
      current = current.cause;
    } else {
      chain.push({ message: redactText(String(current)).slice(0, 300) });
      break;
    }
  }
  const [first, ...causes] = chain;
  return {
    ...(first ?? { message: "Unknown error" }),
    ...(causes.length ? { causes } : {}),
    ...(stack && error instanceof Error && error.stack
      ? {
          stack: error.stack
            .split("\n")
            .slice(0, 12)
            .map((l) => redactText(l)),
        }
      : {}),
  };
}

const colors: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
function pretty(record: Record<string, unknown>, color: boolean) {
  const { timestamp, level, component, event, ...rest } = record;
  const time = typeof timestamp === "string" ? timestamp.slice(11, 23) : "";
  const head = `${time} ${String(level).toUpperCase().padEnd(5)} ${String(component)} ${String(event)}`;
  const tail = Object.entries(rest)
    .map(
      ([k, v]) =>
        `${k}=${typeof v === "string" && !/\s/.test(v) ? v : JSON.stringify(v)}`,
    )
    .join(" ");
  const line = tail ? `${head} ${tail}` : head;
  return color ? `${colors[level as LogLevel]}${line}\x1b[0m` : line;
}

export type LoggerOptions = {
  config?: LogConfig;
  write?: LogSink;
  timestamp?: () => string;
  color?: boolean;
};
export type Logger = {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** Same sink and config with fields added to every event. */
  child(fields: LogFields): Logger;
  readonly config: LogConfig;
  enabled(level: LogLevel): boolean;
};
let resolved: LogConfig | undefined;
function defaultConfig(): LogConfig {
  if (resolved) return resolved;
  try {
    resolved = loadLogEnv();
  } catch {
    resolved = { level: "info", format: "json", bodies: false };
  }
  return resolved;
}
export function createLogger(
  component: string,
  options: LoggerOptions = {},
  base: LogFields = {},
): Logger {
  const config = options.config ?? defaultConfig();
  const write = options.write ?? ((line: string) => console.log(line));
  const timestamp = options.timestamp ?? (() => new Date().toISOString());
  const color =
    options.color ?? (process.stdout.isTTY === true && !process.env.NO_COLOR);
  const enabled = (level: LogLevel) => order[level] >= order[config.level];
  function emit(level: LogLevel, event: string, fields: LogFields = {}) {
    if (!enabled(level)) return;
    try {
      const record: Record<string, unknown> = {
        timestamp: timestamp(),
        level,
        component,
        event,
      };
      for (const [k, v] of Object.entries({ ...base, ...fields }))
        if (v !== undefined) record[k] = redact(v, 0, k);
      const line =
        config.format === "json"
          ? JSON.stringify(record)
          : pretty(record, color);
      const result = write(line);
      if (result instanceof Promise) void result.catch(() => {});
    } catch {
      // Logging must not change the behavior of the code it observes.
    }
  }
  return {
    debug: (e, f) => emit("debug", e, f),
    info: (e, f) => emit("info", e, f),
    warn: (e, f) => emit("warn", e, f),
    error: (e, f) => emit("error", e, f),
    child: (fields) =>
      createLogger(
        component,
        { config, write, timestamp, color },
        { ...base, ...fields },
      ),
    config,
    enabled,
  };
}
