import { expect, it } from "bun:test";
import {
  S3Client as AwsS3,
  CreateBucketCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import { createStorageClient } from "../../src/storage/s3";
import { createMultipartStorage } from "../../src/storage/multipart";
import { loadStorageEnv } from "../../src/config/storage-env";
const endpoint = Bun.env.MEDIA_STORAGE_TEST_ENDPOINT;
if (
  endpoint !== "http://localhost:9000" &&
  endpoint !== "http://127.0.0.1:9000"
)
  throw Error("Explicit loopback MEDIA_STORAGE_TEST_ENDPOINT required.");
const bucket =
  "vertical-movie-app-media-test-" + crypto.randomUUID().slice(0, 8);
const config = loadStorageEnv({
  STORAGE_PROVIDER: "minio",
  S3_ENDPOINT: endpoint,
  S3_REGION: "us-east-1",
  S3_BUCKET: bucket,
  S3_ACCESS_KEY_ID: Bun.env.MEDIA_STORAGE_TEST_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: Bun.env.MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY,
});
it("proves native CRUD plus browser multipart/resume/freeze/abort on a dedicated private MinIO bucket", async () => {
  const sdk = new AwsS3({
    endpoint,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const native = createStorageClient(config),
    storage = createMultipartStorage(config);
  const pending = new Map<string, string>();
  const keys = [
    "outputs/fixture.txt",
    "uploads/browser",
    "sources/frozen",
    "uploads/poster",
    "uploads/abort",
  ];
  let server: ReturnType<typeof Bun.serve> | undefined;
  let created = false;
  let stage = "create";
  try {
    await sdk.send(new CreateBucketCommand({ Bucket: bucket }));
    created = true;
    await native.write(keys[0]!, "native-proof", { type: "text/plain" });
    expect((await native.stat(keys[0]!)).size).toBe(12);
    expect(await native.file(keys[0]!).text()).toBe("native-proof");
    stage = "initiate";
    const uploadId = await storage.initiate(
      keys[1]!,
      "application/octet-stream",
    );
    pending.set(keys[1]!, uploadId);
    const partUrls = await Promise.all(
      [1, 2].map((p) => storage.signPart(keys[1]!, uploadId, p, 60)),
    );
    server = Bun.serve({
      hostname: "0.0.0.0",
      port: 0,
      fetch: () =>
        new Response("<!doctype html><title>Storage proof</title>", {
          headers: { "content-type": "text/html" },
        }),
    });
    const origin = "http://localhost:" + server.port;
    const getUrl = native.presign(keys[0]!, { expiresIn: 60 });
    const bad = new URL(getUrl);
    bad.searchParams.set("X-Amz-Signature", "0".repeat(64));
    const node = Bun.env.MEDIA_BROWSER_NODE,
      worker = Bun.env.MEDIA_BROWSER_WORKER_PATH;
    if (
      !node ||
      !worker ||
      !Bun.env.MEDIA_PLAYWRIGHT_MODULE ||
      !Bun.env.MEDIA_BROWSER_EXECUTABLE
    )
      throw Error("Explicit browser runner config required.");
    stage = "browser";
    const child = Bun.spawn([node, worker], {
      stdin: new Blob([
        JSON.stringify({
          module: Bun.env.MEDIA_PLAYWRIGHT_MODULE,
          executable: Bun.env.MEDIA_BROWSER_EXECUTABLE,
          origin,
          partUrls,
          getUrl,
          rangeUrl: getUrl,
          unsignedUrl: endpoint + "/" + bucket + "/" + keys[0],
          badUrl: bad.href,
        }),
      ]),
      stdout: "pipe",
      stderr: "pipe",
      env: Bun.env,
    });
    const output = await new Response(child.stdout).text();
    const exitCode = await child.exited;
    if (exitCode !== 0) {
      const diagnostic = await new Response(child.stderr).text();
      console.error(
        diagnostic
          .replace(/https?:\/\/\S+/g, "[REDACTED_URL]")
          .replaceAll(config.accessKeyId, "[REDACTED]")
          .replaceAll(config.secretAccessKey, "[REDACTED]")
          .slice(0, 500),
      );
      throw Error("Browser proof failed; URLs and credentials redacted.");
    }
    const result = JSON.parse(output);
    expect(result.getStatus).toBe(200);
    expect(result.text).toBe("native-proof");
    expect(result.rangeStatus).toBe(206);
    expect(result.rangeLength).toBe(4);
    expect(result.unsignedStatus).toBe(403);
    expect(result.tamperedStatus).toBe(403);
    stage = "list";
    const parts = await storage.listParts(keys[1]!, uploadId);
    expect(parts.map((p) => p.sizeBytes)).toEqual([5242880, 1024]);
    expect(parts.map((p) => p.etag)).toEqual(result.etags);
    await storage.complete(keys[1]!, uploadId, parts);
    pending.delete(keys[1]!);
    const source = await storage.stat(keys[1]!);
    expect(source.sizeBytes).toBe(5243904);
    await storage.freeze(keys[1]!, keys[2]!, source.etag);
    const stale = await fetch(partUrls[0]!, {
      method: "PUT",
      body: new Uint8Array(5242880),
    });
    expect(stale.ok).toBe(false);
    expect((await storage.stat(keys[2]!)).sizeBytes).toBe(5243904);
    const posterId = await storage.initiate(keys[3]!, "image/webp");
    pending.set(keys[3]!, posterId);
    const posterUrl = await storage.signPart(keys[3]!, posterId, 1, 60);
    expect(
      (await fetch(posterUrl, { method: "PUT", body: new Uint8Array(128) })).ok,
    ).toBe(true);
    await storage.complete(
      keys[3]!,
      posterId,
      await storage.listParts(keys[3]!, posterId),
    );
    pending.delete(keys[3]!);
    expect((await storage.stat(keys[3]!)).sizeBytes).toBe(128);
    const aborted = await storage.initiate(
      keys[4]!,
      "application/octet-stream",
    );
    pending.set(keys[4]!, aborted);
    await storage.abort(keys[4]!, aborted);
    await storage.abort(keys[4]!, aborted);
    pending.delete(keys[4]!);
    const expired = native.presign(keys[0]!, { expiresIn: 1 });
    await Bun.sleep(2200);
    expect((await fetch(expired)).ok).toBe(false);
    await native.delete(keys[0]!);
    expect(await native.exists(keys[0]!)).toBe(false);
  } catch (error) {
    if (error instanceof Error)
      console.error(
        error.message
          .replace(/https?:\/\/\S+/g, "[REDACTED_URL]")
          .replaceAll(config.accessKeyId, "[REDACTED]")
          .replaceAll(config.secretAccessKey, "[REDACTED]")
          .slice(0, 180),
      );
    if (
      error instanceof Error &&
      (error.name === "AssertionError" || error.name === "TestError")
    )
      throw error;
    throw Error(
      "MinIO integration failed at " +
        stage +
        " (" +
        (error instanceof Error ? error.name : "unknown") +
        "); external details redacted.",
    );
  } finally {
    server?.stop(true);
    if (created) {
      for (const [key, id] of pending) await storage.abort(key, id);
      for (const key of keys) await storage.remove(key);
      await sdk.send(new DeleteBucketCommand({ Bucket: bucket }));
    }
    sdk.destroy();
    storage.close();
  }
}, 60000);
