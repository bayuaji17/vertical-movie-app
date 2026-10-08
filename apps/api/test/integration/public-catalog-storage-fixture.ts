import {
  S3Client as AwsS3,
  CreateBucketCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import { loadStorageEnv } from "../../src/config/storage-env";
import { createStorageClient } from "../../src/storage/s3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transcodePoster } from "../../src/workers/transcode";

/** This helper owns a random loopback MinIO bucket and deletes only objects it wrote. */
export async function publicCatalogStorageFixture() {
  const endpoint = Bun.env.MEDIA_STORAGE_TEST_ENDPOINT;
  if (
    !["http://localhost:9000", "http://127.0.0.1:9000"].includes(endpoint ?? "")
  )
    throw Error("Explicit loopback MEDIA_STORAGE_TEST_ENDPOINT required.");
  const config = loadStorageEnv({
    STORAGE_PROVIDER: "minio",
    S3_ENDPOINT: endpoint,
    S3_REGION: "us-east-1",
    S3_BUCKET:
      "vertical-movie-app-media-test-" + crypto.randomUUID().slice(0, 8),
    S3_ACCESS_KEY_ID: Bun.env.MEDIA_STORAGE_TEST_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: Bun.env.MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY,
  });
  const sdk = new AwsS3({
    endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const native = createStorageClient(config),
    keys = new Set<string>();
  await sdk.send(new CreateBucketCommand({ Bucket: config.bucket }));
  const directory = await mkdtemp(join(tmpdir(), "public-catalog-poster-"));
  try {
    const encoder = Bun.spawn(
      [
        "ffmpeg",
        "-v",
        "error",
        "-i",
        new URL(
          "../../../web/public/images/catalog/after-the-rain.png",
          import.meta.url,
        ).pathname,
        "-vf",
        "scale=1080:1920",
        "-frames:v",
        "1",
        join(directory, "input.jpg"),
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const code = await encoder.exited;
    if (code) throw Error("Fixture WebP encoding failed");
    await transcodePoster(
      join(directory, "input.jpg"),
      join(directory, "poster.webp"),
      "input.jpg",
      Bun.file(join(directory, "input.jpg")).size,
    );
    const image = await Bun.file(join(directory, "poster.webp")).arrayBuffer();
    async function write(
      key: string,
      bytes: Uint8Array = new Uint8Array(image),
    ) {
      if (
        !/^outputs\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/poster\.webp$/.test(
          key,
        )
      )
        throw Error("Refusing non-fixture output key");
      keys.add(key);
      await native.write(key, bytes, { type: "image/webp" });
    }
    async function close() {
      for (const key of keys) await native.delete(key);
      await sdk.send(new DeleteBucketCommand({ Bucket: config.bucket }));
      sdk.destroy();
    }
    return { native, config, image: new Uint8Array(image), write, close };
  } catch (error) {
    await sdk.send(new DeleteBucketCommand({ Bucket: config.bucket }));
    sdk.destroy();
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
