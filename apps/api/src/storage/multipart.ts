import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  ListMultipartUploadsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageEnv } from "../config/storage-env";
export type UploadedPart = {
  partNumber: number;
  etag: string;
  sizeBytes: number;
};
export function assertObjectKey(key: string): void {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.includes("?") ||
    key.includes("#") ||
    key.split("/").some((part) => !part || part === "." || part === "..") ||
    /[\x00-\x1f]/.test(key)
  )
    throw new Error("STORAGE_INVALID_KEY");
}
export function createMultipartStorage(config: StorageEnv) {
  const client = new S3Client({
    requestHandler: { requestTimeout: 60000, connectionTimeout: 10000 },
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const object = (key: string) => {
    assertObjectKey(key);
    return { Bucket: config.bucket, Key: key };
  };
  return {
    async findUploads(key: string): Promise<{ uploadId: string }[]> {
      assertObjectKey(key);
      const uploads: { uploadId: string }[] = [];
      let keyMarker: string | undefined, uploadMarker: string | undefined;
      do {
        const result = await client.send(
          new ListMultipartUploadsCommand({
            Bucket: config.bucket,
            Prefix: key,
            KeyMarker: keyMarker,
            UploadIdMarker: uploadMarker,
          }),
        );
        for (const u of result.Uploads ?? [])
          if (u.Key === key && u.UploadId)
            uploads.push({ uploadId: u.UploadId });
        if (!result.IsTruncated) break;
        if (
          result.NextKeyMarker === keyMarker &&
          result.NextUploadIdMarker === uploadMarker
        )
          throw new Error("STORAGE_PAGINATION_INVALID");
        keyMarker = result.NextKeyMarker;
        uploadMarker = result.NextUploadIdMarker;
      } while (true);
      return uploads;
    },
    async initiate(key: string, contentType: string): Promise<string> {
      const result = await client.send(
        new CreateMultipartUploadCommand({
          ...object(key),
          ContentType: contentType,
        }),
      );
      if (!result.UploadId) throw new Error("STORAGE_UPLOAD_ID_MISSING");
      return result.UploadId;
    },
    async signPart(
      key: string,
      uploadId: string,
      partNumber: number,
      expiresIn: number,
    ): Promise<string> {
      if (
        !uploadId ||
        !Number.isInteger(partNumber) ||
        partNumber < 1 ||
        partNumber > 10000 ||
        !Number.isInteger(expiresIn) ||
        expiresIn < 1 ||
        expiresIn > 604800
      )
        throw new Error("STORAGE_INVALID_PART");
      return getSignedUrl(
        client,
        new UploadPartCommand({
          ...object(key),
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn },
      );
    },
    async listParts(key: string, uploadId: string): Promise<UploadedPart[]> {
      const parts: UploadedPart[] = [];
      let marker: string | undefined;
      do {
        const result = await client.send(
          new ListPartsCommand({
            ...object(key),
            UploadId: uploadId,
            PartNumberMarker: marker,
          }),
        );
        for (const part of result.Parts ?? []) {
          if (!part.PartNumber || !part.ETag || part.Size === undefined)
            throw new Error("STORAGE_PART_METADATA_MISSING");
          parts.push({
            partNumber: part.PartNumber,
            etag: part.ETag,
            sizeBytes: part.Size,
          });
        }
        if (
          result.IsTruncated &&
          (!result.NextPartNumberMarker ||
            result.NextPartNumberMarker === marker)
        )
          throw new Error("STORAGE_PAGINATION_INVALID");
        marker = result.IsTruncated ? result.NextPartNumberMarker : undefined;
      } while (marker);
      return parts;
    },
    async complete(
      key: string,
      uploadId: string,
      parts: UploadedPart[],
    ): Promise<void> {
      await client.send(
        new CompleteMultipartUploadCommand({
          ...object(key),
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map((p) => ({
              PartNumber: p.partNumber,
              ETag: p.etag,
            })),
          },
        }),
      );
    },
    async abort(key: string, uploadId: string): Promise<void> {
      try {
        await client.send(
          new AbortMultipartUploadCommand({
            ...object(key),
            UploadId: uploadId,
          }),
        );
      } catch (error) {
        if ((error as { name?: string }).name !== "NoSuchUpload") throw error;
      }
    },
    async stat(key: string) {
      const result = await client.send(new HeadObjectCommand(object(key)));
      if (result.ContentLength === undefined || !result.ETag)
        throw new Error("STORAGE_OBJECT_METADATA_MISSING");
      return {
        sizeBytes: result.ContentLength,
        etag: result.ETag,
        contentType: result.ContentType ?? "application/octet-stream",
      };
    },
    async freeze(
      stagingKey: string,
      sourceKey: string,
      etag: string,
    ): Promise<void> {
      assertObjectKey(stagingKey);
      await client.send(
        new CopyObjectCommand({
          ...object(sourceKey),
          CopySource: encodeURIComponent(
            config.bucket + "/" + stagingKey,
          ).replace(/%2F/g, "/"),
          CopySourceIfMatch: etag,
          MetadataDirective: "COPY",
        }),
      );
    },
    async listKeys(prefix: string): Promise<string[]> {
      assertObjectKey(prefix.replace(/\/$/, ""));
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const r = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
        for (const item of r.Contents ?? [])
          if (item.Key && item.Key.startsWith(prefix)) keys.push(item.Key);
        if (!r.IsTruncated) break;
        if (!r.NextContinuationToken || r.NextContinuationToken === token)
          throw new Error("STORAGE_PAGINATION_INVALID");
        token = r.NextContinuationToken;
      } while (true);
      return keys;
    },
    async put(key: string, body: Uint8Array, contentType: string) {
      await client.send(
        new PutObjectCommand({
          ...object(key),
          Body: body,
          ContentType: contentType,
          CacheControl: "private, no-store",
        }),
      );
    },
    async remove(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand(object(key)));
    },
    close() {
      client.destroy();
    },
  };
}
export type MultipartStorage = ReturnType<typeof createMultipartStorage>;
