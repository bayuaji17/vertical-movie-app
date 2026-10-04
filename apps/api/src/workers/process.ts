export class MediaProcessError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export type ProcessOptions = {
  timeoutSeconds: number;
  signal?: AbortSignal;
  stallSeconds?: number;
  onProgress?: (seconds: number) => void;
  maxOutputBytes?: number;
};
export async function runMediaProcess(
  args: string[],
  options: ProcessOptions,
): Promise<string> {
  const executable =
    process.platform === "linux"
      ? [
          "timeout",
          "--signal=TERM",
          "--kill-after=10s",
          String(options.timeoutSeconds) + "s",
          ...args,
        ]
      : args;
  const p = Bun.spawn(executable, {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  let reason: string | undefined,
    lastProgress = Date.now(),
    progress = -1,
    output = "",
    diagnostics = "",
    killTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = (code: string) => {
    if (reason) return;
    reason = code;
    p.kill("SIGTERM");
    killTimer = setTimeout(() => {
      // GNU timeout owns the Linux process group; stop its child even if it ignores TERM.
      if (process.platform === "linux") {
        try {
          process.kill(-p.pid, "SIGKILL");
        } catch {
          p.kill("SIGKILL");
        }
      } else p.kill("SIGKILL");
    }, 10000);
  };
  const abort = () => stop("MEDIA_CANCELLED");
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const deadline = setTimeout(
    () => stop("MEDIA_TIMEOUT"),
    options.timeoutSeconds * 1000,
  );
  const stall = options.stallSeconds
    ? setInterval(() => {
        if (Date.now() - lastProgress > options.stallSeconds! * 1000)
          stop("MEDIA_STALLED");
      }, 1000)
    : undefined;
  const stdout = (async () => {
    const decoder = new TextDecoder();
    let pending = "";
    for await (const chunk of p.stdout) {
      const text = decoder.decode(chunk, { stream: true });
      output += text;
      if (options.onProgress) output = output.slice(-65536);
      else if (output.length > (options.maxOutputBytes ?? 1048576)) {
        stop("MEDIA_OUTPUT_LIMIT");
        output = output.slice(-65536);
      }
      pending += text;
      let end;
      while ((end = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 1);
        const m = line.match(/^out_time_us=(\d+)$/);
        if (m) {
          const seconds = Number(m[1]) / 1000000;
          if (seconds > progress) {
            progress = seconds;
            lastProgress = Date.now();
            options.onProgress?.(seconds);
          }
        }
      }
      if (pending.length > 65536) pending = "";
    }
  })();
  const stderr = (async () => {
    for await (const chunk of p.stderr) {
      diagnostics = (diagnostics + new TextDecoder().decode(chunk)).slice(
        -65536,
      );
      /* Bounded diagnostics stay internal; only stable codes leave this boundary. */
    }
  })();
  try {
    const code = await p.exited;
    await Promise.all([stdout, stderr]);
    if (reason) throw new MediaProcessError(reason);
    if (code !== 0) {
      const failure =
        code === 126 || code === 127
          ? "MEDIA_CONFIG_BINARY"
          : code === 124
            ? "MEDIA_TIMEOUT"
            : /No space left on device/i.test(diagnostics)
              ? "MEDIA_RESOURCE_DISK"
              : /Cannot allocate memory|out of memory/i.test(diagnostics)
                ? "MEDIA_RESOURCE_MEMORY"
                : /Unknown encoder|No such filter|Encoder.*not found/i.test(
                      diagnostics,
                    )
                  ? "MEDIA_CONFIG_CODEC"
                  : /Invalid data found|moov atom not found|Error while decoding|corrupt decoded frame/i.test(
                        diagnostics,
                      )
                    ? "MEDIA_INVALID_DECODE"
                    : "MEDIA_PROCESS_FAILED";
      throw new MediaProcessError(failure);
    }
    return output;
  } finally {
    clearTimeout(deadline);
    if (stall) clearInterval(stall);
    if (killTimer) clearTimeout(killTimer);
    options.signal?.removeEventListener("abort", abort);
  }
}
