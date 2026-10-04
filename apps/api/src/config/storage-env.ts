export type StorageProvider = "minio" | "r2";
export interface StorageEnv {
  provider: StorageProvider;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  upload: {
    partConcurrency: number;
    sessionTtlSeconds: number;
    partUrlTtlSeconds: number;
  };
}
type Source = Record<string, string | undefined>;
function required(source: Source, name: string): string {
  const value = source[name];
  if (!value || !value.trim() || value !== value.trim())
    throw new Error(name + " wajib diisi tanpa whitespace di tepi.");
  return value;
}
function integer(
  source: Source,
  name: string,
  fallback: number,
  max: number,
): number {
  const raw = source[name] ?? String(fallback);
  const value = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > max
  )
    throw new Error(name + " harus integer positif dalam batas yang didukung.");
  return value;
}
export function loadStorageEnv(source: Source = Bun.env): StorageEnv {
  const provider = source.STORAGE_PROVIDER;
  if (provider !== "minio" && provider !== "r2")
    throw new Error("STORAGE_PROVIDER harus minio atau r2.");
  if (source.NODE_ENV === "production" && provider !== "r2")
    throw new Error("Production proyek ini memerlukan STORAGE_PROVIDER=r2.");
  let endpoint: URL;
  try {
    endpoint = new URL(required(source, "S3_ENDPOINT"));
  } catch {
    throw new Error(
      "S3_ENDPOINT harus berupa origin API S3 HTTP(S) yang valid.",
    );
  }
  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.port === "9001"
  )
    throw new Error(
      "S3_ENDPOINT harus origin API S3, bukan Console/path/credential.",
    );
  const region = required(source, "S3_REGION");
  if (
    provider === "r2" &&
    (endpoint.protocol !== "https:" ||
      !/^[a-z0-9-]+\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname) ||
      endpoint.port ||
      region !== "auto")
  )
    throw new Error(
      "R2 memerlukan endpoint S3 HTTPS Cloudflare dan region auto.",
    );
  if (
    provider === "minio" &&
    (!/^[a-z0-9-]+$/.test(region) || region === "auto")
  )
    throw new Error(
      "S3_REGION MinIO harus region yang dikonfigurasi pada server.",
    );
  const bucket = required(source, "S3_BUCKET");
  if (
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) ||
    bucket.includes("..") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(bucket)
  )
    throw new Error("S3_BUCKET harus nama bucket S3 yang valid.");
  const sessionToken = source.S3_SESSION_TOKEN;
  if (
    sessionToken !== undefined &&
    sessionToken !== "" &&
    sessionToken !== sessionToken.trim()
  )
    throw new Error(
      "S3_SESSION_TOKEN tidak boleh memiliki whitespace di tepi.",
    );
  return {
    provider,
    endpoint: endpoint.origin,
    region,
    bucket,
    accessKeyId: required(source, "S3_ACCESS_KEY_ID"),
    secretAccessKey: required(source, "S3_SECRET_ACCESS_KEY"),
    ...(sessionToken ? { sessionToken } : {}),
    upload: {
      partConcurrency: integer(source, "MEDIA_UPLOAD_PART_CONCURRENCY", 3, 100),
      sessionTtlSeconds: integer(
        source,
        "MEDIA_UPLOAD_SESSION_TTL_SECONDS",
        86400,
        604800,
      ),
      partUrlTtlSeconds: integer(
        source,
        "MEDIA_UPLOAD_PART_URL_TTL_SECONDS",
        900,
        604800,
      ),
    },
  };
}
