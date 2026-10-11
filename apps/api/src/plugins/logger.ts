import { Elysia, StatusMap } from "elysia";
import {
  createLogger,
  errorFields,
  redact,
  redactQuery,
  requestIdFrom,
  requestIdHeader,
  type LogConfig,
} from "@repo/log";

import { mapContentError } from "../shared/content-error";

export type RequestLoggerDependencies = {
  write?: (line: string) => void | Promise<void>;
  now?: () => number;
  timestamp?: () => string;
  config?: LogConfig;
};

type RequestLogState = {
  requestId: string;
  method: string;
  path: string;
  startedAt: number;
  errorCode?: string;
};

const maxBody = 2048;
// Private or signed material: credentials, upload parts and presigned URLs,
// playback manifests/URLs and poster capabilities are never body-logged.
const bodyExcluded =
  /^\/(?:api\/)?auth(?:\/|$)|\/media\/uploads|\/playback|\/poster/i;
export function bodyLoggable(path: string) {
  return !bodyExcluded.test(path);
}
const intHeader = (value: string | null) => {
  const n = value === null ? NaN : Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
};
function responseBytes(value: unknown, deep: boolean) {
  if (value instanceof Response)
    return intHeader(value.headers.get("content-length"));
  if (typeof value === "string") return Buffer.byteLength(value);
  if (value instanceof Uint8Array) return value.byteLength;
  if (value instanceof Blob) return value.size;
  if (deep && value !== null && typeof value === "object") {
    try {
      return Buffer.byteLength(JSON.stringify(value));
    } catch {
      return undefined;
    }
  }
  return undefined;
}
/** Status and domain code the error mapper will produce for this failure. */
function classify(error: unknown, code: string | number) {
  const domain = mapContentError(error);
  if (domain) return { status: domain.httpStatus, errorCode: domain.code };
  if (code === "VALIDATION" || code === "PARSE")
    return { status: 422, errorCode: "VALIDATION_ERROR" };
  if (code === "NOT_FOUND") return { status: 404, errorCode: "NOT_FOUND" };
  return { status: 500, errorCode: "INTERNAL_ERROR" };
}
function bodyRecord(value: unknown) {
  const text = JSON.stringify(redact(value));
  return text.length > maxBody
    ? { body: text.slice(0, maxBody), truncated: true }
    : { body: text, truncated: false };
}

export function createRequestLogger({
  write,
  now = () => performance.now(),
  timestamp,
  config,
}: RequestLoggerDependencies = {}) {
  const log = createLogger("api", { write, timestamp, config, color: false });
  const requests = new WeakMap<Request, RequestLogState>();
  const bodies = log.config.bodies;

  return (
    new Elysia({ name: "api.request-logger" })
      .onRequest(({ request, set }) => {
        const url = new URL(request.url);
        const state: RequestLogState = {
          requestId: requestIdFrom(request.headers),
          method: request.method,
          path: url.pathname.slice(0, 512),
          startedAt: now(),
        };
        requests.set(request, state);
        set.headers[requestIdHeader] = state.requestId;
        log.info("http.request", {
          requestId: state.requestId,
          method: state.method,
          path: state.path,
          query: url.search ? redactQuery(url.searchParams) : undefined,
          contentType: request.headers.get("content-type")?.slice(0, 100),
          requestBytes: intHeader(request.headers.get("content-length")),
          origin: request.headers.get("origin")?.slice(0, 200) ?? undefined,
          userAgent: request.headers.get("user-agent")?.slice(0, 120),
        });
      })
      .onTransform({ as: "global" }, ({ request, body }) => {
        const state = requests.get(request);
        if (!bodies || !state || body === undefined || body === null) return;
        if (
          !bodyLoggable(state.path) ||
          !request.headers.get("content-type")?.includes("json")
        )
          return;
        log.debug("http.body", {
          requestId: state.requestId,
          direction: "request",
          ...bodyRecord(body),
        });
      })
      .onAfterHandle({ as: "global" }, ({ request, responseValue }) => {
        const state = requests.get(request);
        if (!bodies || !state || !bodyLoggable(state.path)) return;
        const value = responseValue;
        if (
          value === undefined ||
          value === null ||
          typeof value === "string" ||
          value instanceof Response ||
          value instanceof Blob ||
          value instanceof Uint8Array ||
          typeof value !== "object"
        )
          return;
        log.debug("http.body", {
          requestId: state.requestId,
          direction: "response",
          ...bodyRecord(value),
        });
      })
      // In Elysia 1.4.30, composed apps with an empty error-hook array skip
      // afterResponse for unmatched routes. This observer keeps the default
      // error path and records why a request failed.
      .onError({ as: "global" }, ({ request, error, code }) => {
        const state = requests.get(request);
        if (!state) return;
        const { status, errorCode } = classify(error, code);
        state.errorCode = errorCode;
        const fields = {
          requestId: state.requestId,
          method: state.method,
          path: state.path,
          status,
          errorCode,
          // Validation messages embed the submitted input, so only a fixed text is logged.
          ...(errorCode === "VALIDATION_ERROR"
            ? {
                name: "ValidationError",
                message: "Request input is invalid.",
                code,
              }
            : errorFields(
                error,
                status >= 500 && process.env.NODE_ENV !== "production",
              )),
        };
        if (status >= 500) log.error("http.error", fields);
        else if (status === 404 || status === 422)
          log.info("http.error", fields);
        else log.warn("http.error", fields);
      })
      .onAfterResponse(
        { as: "global" },
        async ({ request, responseValue, set }) => {
          const state = requests.get(request);
          if (!state) return;
          let value = responseValue;
          if (value instanceof Promise) {
            try {
              value = await value;
            } catch {
              // The error lifecycle owns completion for a rejected handler.
              return;
            }
          }
          if (requests.get(request) !== state) return;
          requests.delete(request);
          const setStatus =
            typeof set.status === "string"
              ? StatusMap[set.status]
              : (set.status ?? 200);
          // Elysia keeps a non-200 Response status, but applies set.status to a 200 Response.
          const status =
            value instanceof Response && value.status !== 200
              ? value.status
              : setStatus;
          const fields = {
            requestId: state.requestId,
            method: state.method,
            path: state.path,
            status,
            durationMs:
              Math.round(Math.max(0, now() - state.startedAt) * 100) / 100,
            responseBytes: responseBytes(value, log.enabled("debug")),
            errorCode: state.errorCode,
          };
          if (status >= 500) log.error("http.response", fields);
          else if (status >= 400) log.warn("http.response", fields);
          else log.info("http.response", fields);
        },
      )
  );
}
