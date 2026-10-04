import { expect, it } from "bun:test";
import { createStorageClient } from "./s3";
import { loadStorageEnv } from "../config/storage-env";
it("constructs explicit provider without network and presigns only scoped private objects", () => {
  const client = createStorageClient(
    loadStorageEnv({
      STORAGE_PROVIDER: "minio",
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "vertical-movie-app",
      S3_ACCESS_KEY_ID: "fixture-access",
      S3_SECRET_ACCESS_KEY: "fixture-secret",
    }),
  );
  const signed = new URL(
    client.presign("outputs/fixture/master.m3u8", { expiresIn: 120 }),
  );
  expect(signed.hostname).toBe("localhost");
  expect(signed.searchParams.get("X-Amz-Expires")).toBe("120");
  expect(signed.searchParams.has("X-Amz-Signature")).toBe(true);
  expect(signed.href).not.toContain("fixture-secret");
  expect(signed.searchParams.has("x-amz-acl")).toBe(false);
});
