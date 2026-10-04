import { describe, expect, it } from "bun:test";
import { loadStorageEnv } from "./storage-env";
import { loadApiEnv } from "./env";
const valid = {
  STORAGE_PROVIDER: "minio",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "vertical-movie-app",
  S3_ACCESS_KEY_ID: "fixture-access",
  S3_SECRET_ACCESS_KEY: "fixture-secret",
};
describe("storage env", () => {
  it("loads MinIO and approved upload defaults", () => {
    expect(loadStorageEnv(valid)).toMatchObject({
      provider: "minio",
      endpoint: valid.S3_ENDPOINT,
      region: "us-east-1",
      bucket: valid.S3_BUCKET,
      upload: {
        partConcurrency: 3,
        sessionTtlSeconds: 86400,
        partUrlTtlSeconds: 900,
      },
    });
  });
  it("loads explicit R2 production and session token", () => {
    expect(
      loadStorageEnv({
        ...valid,
        NODE_ENV: "production",
        STORAGE_PROVIDER: "r2",
        S3_ENDPOINT: "https://fixture.r2.cloudflarestorage.com",
        S3_REGION: "auto",
        S3_SESSION_TOKEN: "fixture-token",
      }),
    ).toMatchObject({
      provider: "r2",
      region: "auto",
      sessionToken: "fixture-token",
    });
  });
  for (const [name, value] of [
    ["STORAGE_PROVIDER", "s3"],
    ["S3_ENDPOINT", "http://localhost:9001"],
    ["S3_ENDPOINT", "http://localhost:9000/browser/bucket"],
    ["S3_ENDPOINT", "http://user:secret@localhost:9000"],
    ["S3_ENDPOINT", "http://localhost:9000/?key=secret"],
    ["S3_REGION", "auto"],
    ["S3_BUCKET", "invalid/bucket"],
    ["S3_ACCESS_KEY_ID", ""],
    ["S3_SECRET_ACCESS_KEY", ""],
    ["S3_SESSION_TOKEN", " "],
    ["MEDIA_UPLOAD_PART_CONCURRENCY", "0"],
    ["MEDIA_UPLOAD_PART_CONCURRENCY", "1.5"],
    ["MEDIA_UPLOAD_SESSION_TTL_SECONDS", "1e5"],
    ["MEDIA_UPLOAD_PART_URL_TTL_SECONDS", "604801"],
  ]) {
    it("rejects invalid " + name + " without leaking input", () => {
      expect(() => loadStorageEnv({ ...valid, [name!]: value })).toThrow();
    });
  }
  it("rejects missing provider even if credentials exist", () => {
    expect(() =>
      loadStorageEnv({ ...valid, STORAGE_PROVIDER: undefined }),
    ).toThrow("STORAGE_PROVIDER");
  });
  it("rejects MinIO production and R2 invalid transport/domain/region", () => {
    expect(() => loadStorageEnv({ ...valid, NODE_ENV: "production" })).toThrow(
      "Production",
    );
    for (const [endpoint, region] of [
      ["http://fixture.r2.cloudflarestorage.com", "auto"],
      ["https://example.com", "auto"],
      ["https://fixture.r2.cloudflarestorage.com", "us-east-1"],
    ])
      expect(() =>
        loadStorageEnv({
          ...valid,
          STORAGE_PROVIDER: "r2",
          S3_ENDPOINT: endpoint,
          S3_REGION: region,
        }),
      ).toThrow("R2");
  });
  it("reports names without credentials or malformed endpoint values", () => {
    try {
      loadStorageEnv({
        ...valid,
        S3_ENDPOINT: "http://secret-user:private-password@localhost:9000",
      });
      throw Error("expected validation");
    } catch (e) {
      expect((e as Error).message).toContain("S3_ENDPOINT");
      expect((e as Error).message).not.toContain("private-password");
    }
  });
  it("preserves metadata-only config unless provider explicitly enables media", () => {
    const auth = {
      DATABASE_URL: "postgresql://test:test@localhost/app",
      BETTER_AUTH_URL: "http://localhost:3000",
      WEB_ORIGIN: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-only-auth-secret-at-least-32-characters",
    };
    expect(loadApiEnv(auth).storage).toBeUndefined();
    expect(loadApiEnv({ ...auth, ...valid }).storage?.provider).toBe("minio");
    expect(() => loadApiEnv({ ...auth, STORAGE_PROVIDER: "" })).toThrow(
      "STORAGE_PROVIDER",
    );
  });
});
