import { expect, test } from "bun:test";
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { createLogger } from "@repo/log";

import { resetMediaDatabase } from "./media-fixture";
import { actor, attachMedia } from "./content-delete-fixture";
import { loadStorageEnv } from "../../src/config/storage-env";
import { createMultipartStorage } from "../../src/storage/multipart";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { createTombstoneSweep } from "../../src/workers/tombstones";

const endpoint = Bun.env.MEDIA_STORAGE_TEST_ENDPOINT;
if (
  endpoint !== "http://localhost:9000" &&
  endpoint !== "http://127.0.0.1:9000"
)
  throw new Error("Explicit loopback test storage required.");

test("deleting content leaves tombstones that the worker sweep turns into removed storage objects", async () => {
  const database = await resetMediaDatabase();
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
  const storage = createMultipartStorage(config);
  const sdk = new S3Client({
    endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const keys = async () =>
    (
      (await sdk.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents ??
      []
    )
      .map((o) => o.Key!)
      .sort();
  const put = (key: string) =>
    sdk.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "x" }));
  const records: Array<Record<string, unknown>> = [];
  const log = createLogger("worker", {
    config: { level: "debug", format: "json", bodies: false },
    write: (line) => void records.push(JSON.parse(line)),
  });
  try {
    await sdk.send(new CreateBucketCommand({ Bucket: bucket }));
    const videos = new VideosService(createVideosRepository(database.db));
    const doomed = await videos.create(
      { kind: "movie", title: "Doomed" },
      actor,
    );
    const kept = await videos.create({ kind: "movie", title: "Kept" }, actor);
    const a = await attachMedia(
      database.client,
      { videoId: doomed.id },
      "source",
      "succeeded",
      "completed",
      bucket,
    );
    const k = await attachMedia(
      database.client,
      { videoId: kept.id },
      "source",
      "succeeded",
      "completed",
      bucket,
    );
    const doomedKeys = [
      `sources/${a.assetId}/original`,
      `uploads/${a.sessionId}/original`,
      `outputs/${a.assetId}/${a.jobId}/${crypto.randomUUID()}/master.m3u8`,
      `outputs/${a.assetId}/${a.jobId}/${crypto.randomUUID()}/0/segment_000000.m4s`,
    ];
    const keptKeys = [
      `sources/${k.assetId}/original`,
      `outputs/${k.assetId}/${k.jobId}/${crypto.randomUUID()}/master.m3u8`,
    ];
    for (const key of [...doomedKeys, ...keptKeys]) await put(key);
    expect(await keys()).toHaveLength(6);

    await videos.remove(doomed.id, doomed.rowVersion, actor);
    // The API never touches storage: everything is still there, recorded as tombstones.
    expect(await keys()).toHaveLength(6);
    expect(
      (
        await database.client`SELECT count(*)::int n FROM media_storage_tombstones WHERE deleted_at IS NULL`
      )[0].n,
    ).toBe(3);

    // An unsafe key and a tombstone for another bucket must never be acted on.
    await database.client`INSERT INTO media_storage_tombstones (provider,bucket,kind,key) VALUES ('minio',${bucket},'object','not/an/app/key')`;
    await database.client`INSERT INTO media_storage_tombstones (provider,bucket,kind,key) VALUES ('minio','another-bucket','object',${keptKeys[0]!})`;

    // First sweep: storage fails once for the first object, then recovers.
    let failures = 1;
    const flaky = {
      remove: async (key: string) => {
        if (failures-- > 0) throw new Error("storage unavailable");
        await storage.remove(key);
      },
      listKeys: (prefix: string) => storage.listKeys(prefix),
    };
    const flakySweep = createTombstoneSweep({
      client: database.client,
      storage: flaky,
      profile: config,
      log,
    });
    const first = await flakySweep();
    expect(first.failed).toBeGreaterThanOrEqual(2);
    const retry = await createTombstoneSweep({
      client: database.client,
      storage,
      profile: config,
      log,
    })();
    expect(retry.removed).toBeGreaterThanOrEqual(1);
    await createTombstoneSweep({
      client: database.client,
      storage,
      profile: config,
      log,
    })();

    expect(await keys()).toEqual([...keptKeys].sort());
    const rows =
      await database.client`SELECT bucket,key,attempts,deleted_at,last_error FROM media_storage_tombstones ORDER BY key`;
    expect(
      rows.filter(
        (r: { deleted_at: Date | null; bucket: string }) =>
          r.deleted_at && r.bucket === bucket,
      ),
    ).toHaveLength(3);
    const unsafe = rows.find(
      (r: { key: string }) => r.key === "not/an/app/key",
    );
    expect(unsafe.deleted_at).toBeNull();
    expect(unsafe.attempts).toBeGreaterThanOrEqual(1);
    expect(unsafe.last_error).toContain("not an application storage key");
    const other = rows.find(
      (r: { bucket: string }) => r.bucket === "another-bucket",
    );
    expect(other).toMatchObject({ deleted_at: null, attempts: 0 });
    expect(records.some((r) => r.event === "cleanup.tombstone_failed")).toBe(
      true,
    );
    expect(records.some((r) => r.event === "cleanup.tombstones")).toBe(true);
  } finally {
    for (const key of await keys().catch(() => [] as string[]))
      await sdk.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    await sdk
      .send(new DeleteBucketCommand({ Bucket: bucket }))
      .catch(() => undefined);
    storage.close();
    sdk.destroy();
    await database.client.close();
  }
}, 60000);
