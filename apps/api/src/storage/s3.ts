import { S3Client } from "bun";
import type { StorageEnv } from "../config/storage-env";
/** Explicit factory: no global credentials, network requests, or env reads on import. */
export function createStorageClient(config: StorageEnv): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
  });
}
