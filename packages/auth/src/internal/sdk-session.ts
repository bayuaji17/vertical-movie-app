import { AuthDependencyError, projectSession } from "./projection";
import type { SessionInput } from "./projection";

export type SessionReadOptions = {
  signal?: AbortSignal;
  authoritative?: boolean;
  timeoutMs?: number;
};
export async function readSdkSession(
  read: (
    signal: AbortSignal,
  ) => Promise<{
    data: SessionInput | null;
    error: { status?: number } | null;
  }>,
  options: SessionReadOptions = {},
) {
  const controller = new AbortController();
  const timeoutReason = new AuthDependencyError("timeout");
  const timer = setTimeout(
    () => controller.abort(timeoutReason),
    options.timeoutMs ?? 10_000,
  );
  const cancel = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  try {
    if (controller.signal.aborted) throw controller.signal.reason;
    const result = await read(controller.signal);
    if (controller.signal.aborted) throw controller.signal.reason;
    if (result.error)
      throw new AuthDependencyError(
        result.error.status ? "upstream" : "network",
        result.error.status,
      );
    return projectSession(result.data);
  } catch (error) {
    if (options.signal?.aborted) throw options.signal.reason;
    if (controller.signal.aborted) throw timeoutReason;
    if (error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("network");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
