import { expect, test } from "bun:test";
import { loadApiEnv } from "./env";
import { loadStorageEnv } from "./storage-env";
import { loadWorkerEnv } from "./worker-env";
import { loadPosterEnv } from "./poster-env";
import { loadPlaybackBaseUrl, loadUrlLifetimes } from "./playback-env";
import { loadLogEnv } from "@repo/log";

// The production sample must stay a valid starting point: after replacing the
// CHANGE_ME placeholders every loader the API and the worker use must accept it.
const file = new URL("../../.env.production.example", import.meta.url);
async function parsed(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {};
  for (const line of (await Bun.file(file).text()).split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match) values[match[1]!] = match[2]!;
  }
  return { ...values, ...overrides };
}
const filled = {
  DATABASE_URL: "postgresql://vmovie:s3cret@127.0.0.1:5432/vertical_movie_app",
  BETTER_AUTH_SECRET: "x".repeat(48),
  S3_ENDPOINT: "https://0123456789abcdef.r2.cloudflarestorage.com",
  S3_BUCKET: "movies-prod",
  S3_ACCESS_KEY_ID: "access-key",
  S3_SECRET_ACCESS_KEY: "secret-key",
};

test("the production sample is accepted once the placeholders are replaced", async () => {
  const env = await parsed(filled);
  expect(Object.values(env).some((v) => v.includes("CHANGE_ME"))).toBe(false);
  const api = loadApiEnv(env);
  expect(api.webOrigin).toBe("https://movies.example.com");
  expect(api.storage).toMatchObject({ provider: "r2", region: "auto" });
  expect(loadStorageEnv(env).bucket).toBe("movies-prod");
  expect(loadWorkerEnv(env)).toBeDefined();
  expect(loadPosterEnv(env)).toBeDefined();
  expect(loadPlaybackBaseUrl(env.MEDIA_PLAYBACK_BASE_URL, api.webOrigin)).toBe(
    "https://movies.example.com/api",
  );
  expect(loadUrlLifetimes(env)).toEqual({
    posterSeconds: 86400,
    hlsMinSeconds: 3600,
  });
  const log = loadLogEnv(env);
  expect(log).toMatchObject({ level: "info", format: "json", bodies: false });
});
test("the sample is production: R2 only, JSON logs, and every secret is a placeholder", async () => {
  const env = await parsed();
  expect(env.NODE_ENV).toBe("production");
  expect(env.STORAGE_PROVIDER).toBe("r2");
  for (const name of [
    "BETTER_AUTH_SECRET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ])
    expect(env[name]).toBe("CHANGE_ME");
  // Test-only variables never belong in a production file.
  expect(Object.keys(env).filter((k) => /TEST|PROOF|BROWSER/.test(k))).toEqual(
    [],
  );
  // MinIO is rejected by the validation, which is why the sample uses R2.
  expect(() =>
    loadStorageEnv({ ...env, ...filled, STORAGE_PROVIDER: "minio" }),
  ).toThrow(/r2/i);
});
test("an unreplaced placeholder fails fast instead of starting half-configured", async () => {
  const env = await parsed(filled);
  expect(() => loadApiEnv({ ...env, BETTER_AUTH_SECRET: "CHANGE_ME" })).toThrow(
    /32 karakter/,
  );
  expect(() =>
    loadStorageEnv({
      ...env,
      S3_ENDPOINT: "https://CHANGE_ME_ACCOUNT_ID.r2.cloudflarestorage.com",
    }),
  ).toThrow();
});
