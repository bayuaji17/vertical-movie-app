type InputStream = typeof process.stdin;
type OutputStream = typeof process.stderr;

export function readHiddenPassword(
  input: InputStream = process.stdin,
  output: OutputStream = process.stderr,
): Promise<string> {
  output.write("Admin password (hidden): ");

  if (input.isTTY && typeof input.setRawMode === "function") {
    return new Promise((resolve, reject) => {
      let value = "";
      const previousRawMode = input.isRaw;

      const finish = (result?: string, error?: Error) => {
        input.off("data", onData);
        input.off("end", onEnd);
        input.setRawMode(previousRawMode ?? false);
        input.pause();
        output.write("\n");
        if (error) reject(error);
        else resolve(result ?? "");
      };

      const onEnd = () => finish(value);
      const onData = (chunk: Buffer | string) => {
        for (const character of String(chunk)) {
          if (character === "\u0003") {
            finish(undefined, new Error("Password input interrupted."));
            return;
          }
          if (character === "\r" || character === "\n") {
            finish(value);
            return;
          }
          if (character === "\u007f" || character === "\b") {
            value = Array.from(value).slice(0, -1).join("");
            continue;
          }
          value += character;
        }
      };

      input.setRawMode(true);
      input.resume();
      input.on("data", onData);
      input.once("end", onEnd);
    });
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (result?: string, error?: Error) => {
      input.off("data", onData);
      input.off("end", onEnd);
      output.write("\n");
      if (error) reject(error);
      else resolve(result ?? "");
    };
    const onEnd = () => finish(value.replace(/[\r\n]+$/, ""));
    const onData = (chunk: Buffer | string) => {
      const text = String(chunk);
      const newline = text.search(/[\r\n]/);
      if (newline === -1) {
        value += text;
        return;
      }
      value += text.slice(0, newline);
      finish(value);
    };

    input.resume();
    input.on("data", onData);
    input.once("end", onEnd);
  });
}
