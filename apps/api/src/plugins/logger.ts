import { Elysia, StatusMap } from "elysia";

export type RequestLoggerDependencies = {
  write?: (line: string) => void | Promise<void>;
  now?: () => number;
  timestamp?: () => string;
};

type RequestLogState = {
  requestId: string;
  method: string;
  path: string;
  startedAt: number;
};

export function createRequestLogger({
  write = (line) => console.log(line),
  now = () => performance.now(),
  timestamp = () => new Date().toISOString(),
}: RequestLoggerDependencies = {}) {
  const requests = new WeakMap<Request, RequestLogState>();

  function emit(record: Record<string, string | number>) {
    try {
      const result = write(JSON.stringify(record));
      if (result instanceof Promise) void result.catch(() => {});
    } catch {
      // Console output must not change HTTP behavior when its sink fails.
    }
  }

  return new Elysia({ name: "api.request-logger" })
    .onRequest(({ request }) => {
      const state = {
        requestId: crypto.randomUUID(),
        method: request.method,
        path: new URL(request.url).pathname.slice(0, 512),
        startedAt: now(),
      };
      requests.set(request, state);
      emit({
        timestamp: timestamp(),
        event: "http.request",
        requestId: state.requestId,
        method: state.method,
        path: state.path,
      });
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
        emit({
          timestamp: timestamp(),
          event: "http.response",
          requestId: state.requestId,
          method: state.method,
          path: state.path,
          status,
          durationMs:
            Math.round(Math.max(0, now() - state.startedAt) * 100) / 100,
        });
      },
    );
}
