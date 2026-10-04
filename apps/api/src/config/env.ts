import { loadStorageEnv, type StorageEnv } from "./storage-env";
export { loadStorageEnv } from "./storage-env";

export interface ApiEnv {
  storage?: StorageEnv;
  port: number;
  databaseUrl: string;
  betterAuthUrl: string;
  betterAuthSecret: string;
  webOrigin: string;
}

export function loadDatabaseUrl(
  source: Record<string, string | undefined> = Bun.env,
): string {
  const databaseUrl = source.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL wajib diisi.");

  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL harus berupa URL PostgreSQL yang valid.");
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !database.hostname
  ) {
    throw new Error("DATABASE_URL harus memakai skema PostgreSQL.");
  }

  return databaseUrl;
}

function parseOrigin(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} wajib diisi.`);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} harus berupa origin HTTP(S) yang valid.`);
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} harus berisi origin HTTP(S) tanpa path atau credential.`,
    );
  }

  if (
    url.protocol === "http:" &&
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  ) {
    throw new Error(`${name} harus memakai HTTPS di luar development lokal.`);
  }

  return url.origin;
}

export function loadApiEnv(
  source: Record<string, string | undefined> = Bun.env,
): ApiEnv {
  const portValue = source.PORT ?? "3001";
  const port = Number(portValue);
  if (
    !/^\d+$/.test(portValue) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("PORT harus berupa bilangan bulat antara 1 dan 65535.");
  }

  const databaseUrl = loadDatabaseUrl(source);

  const secret = source.BETTER_AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("BETTER_AUTH_SECRET wajib berisi setidaknya 32 karakter.");
  }

  const betterAuthUrl = parseOrigin("BETTER_AUTH_URL", source.BETTER_AUTH_URL);
  const webOrigin = parseOrigin("WEB_ORIGIN", source.WEB_ORIGIN);
  if (betterAuthUrl !== webOrigin) {
    throw new Error(
      "BETTER_AUTH_URL dan WEB_ORIGIN harus mengarah ke origin web yang sama.",
    );
  }

  return {
    ...(source.STORAGE_PROVIDER !== undefined
      ? { storage: loadStorageEnv(source) }
      : {}),
    port,
    databaseUrl,
    betterAuthUrl,
    betterAuthSecret: secret,
    webOrigin,
  };
}
