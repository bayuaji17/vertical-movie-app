import { loadDatabaseUrl } from "../../config/env";
import { createDatabase } from "../../db/client";
import { AdminProvisionConflictError, provisionAdmin } from "./admin-provision";

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

async function main() {
  const [email, ...extraArgs] = Bun.argv.slice(2);
  if (!email || extraArgs.length > 0) {
    console.error(
      "Usage: bun run --cwd apps/api admin:provision -- <admin-email> (password from hidden prompt or stdin)",
    );
    process.exitCode = 1;
    return;
  }

  const password = await readHiddenPassword();
  const { client, db } = createDatabase(loadDatabaseUrl());
  try {
    const result = await provisionAdmin(db, { email, password });
    console.info(
      result.status === "created"
        ? "Admin provisioned."
        : "Admin already provisioned; existing password unchanged.",
    );
  } catch (error) {
    if (error instanceof AdminProvisionConflictError) {
      console.error(
        "Admin provisioning conflict: one identity is already configured.",
      );
    } else {
      console.error(
        "Admin provisioning failed. Check the email, password, schema, and database setup.",
      );
    }
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

if (import.meta.main) await main();
