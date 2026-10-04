import { ContentError, invalid } from "../../shared/content-error";
import type { UploadedPart } from "../../storage/multipart";
export type Owner = { ownerType: "video" | "series"; ownerId: string };
export type UploadKind = "source" | "poster";
export function geometry(size: bigint) {
  if (size <= 0n || size > 1500000000n)
    invalid("File size is outside the supported limit.");
  const partSize =
    (size + 49n) / 50n > 5242880n ? (size + 49n) / 50n : 5242880n;
  return {
    partSizeBytes: partSize,
    partCount: Number((size + partSize - 1n) / partSize),
  };
}
export function validateUpload(
  kind: UploadKind,
  videoKind: string | undefined,
  filename: string,
  contentType: string,
  size: bigint,
) {
  const limit =
    kind === "poster"
      ? 5000000n
      : videoKind === "episode"
        ? 512000000n
        : 1500000000n;
  if (size <= 0n || size > limit)
    invalid("File exceeds the limit for this content kind.");
  if (!filename || filename.length > 255 || /[\\/\u0000-\u001f]/.test(filename))
    invalid("Filename is invalid.");
  const ext = filename.split(".").pop()?.toLowerCase();
  const allowed: Record<string, string[]> =
    kind === "poster"
      ? {
          jpg: ["image/jpeg"],
          jpeg: ["image/jpeg"],
          png: ["image/png"],
          webp: ["image/webp"],
        }
      : {
          mp4: ["video/mp4"],
          mov: ["video/quicktime"],
          mkv: ["video/x-matroska"],
          webm: ["video/webm"],
        };
  if (!ext || !allowed[ext]?.includes(contentType))
    invalid("Filename and media type are unsupported.");
}
export function partTtl(expiresAt: Date, now: Date, limit: number) {
  const ttl = Math.min(
    limit,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
  );
  if (ttl < 1)
    throw new ContentError("UPLOAD_EXPIRED", "Upload session has expired.");
  return ttl;
}
export function verifyParts(
  parts: UploadedPart[],
  size: bigint,
  partSize: bigint,
  count: number,
) {
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  if (sorted.length !== count) invalid("Upload is incomplete.");
  let total = 0n;
  for (let i = 0; i < count; i++) {
    const p = sorted[i],
      expected = i === count - 1 ? size - partSize * BigInt(i) : partSize;
    if (
      p.partNumber !== i + 1 ||
      !p.etag ||
      !Number.isSafeInteger(p.sizeBytes) ||
      BigInt(p.sizeBytes) !== expected
    )
      invalid("Uploaded part size or number is invalid.");
    total += BigInt(p.sizeBytes);
  }
  if (total !== size) invalid("Uploaded size is invalid.");
  return sorted;
}
