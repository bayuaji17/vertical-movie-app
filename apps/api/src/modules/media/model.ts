import { t, type Static } from "elysia";
import { Uuid } from "../../shared/content-model";
const Size = t.String({ pattern: "^[1-9][0-9]{0,15}$" });
export const InitiateUploadBody = t.Object(
  {
    ownerType: t.Union([t.Literal("video"), t.Literal("series")]),
    ownerId: Uuid,
    kind: t.Union([t.Literal("source"), t.Literal("poster")]),
    filename: t.String({ minLength: 1, maxLength: 255 }),
    contentType: t.String({ minLength: 1, maxLength: 100 }),
    sizeBytes: Size,
    idempotencyKey: Uuid,
  },
  { additionalProperties: false },
);
export type InitiateUploadInput = Static<typeof InitiateUploadBody>;
export const UploadParams = t.Object(
  { id: Uuid },
  { additionalProperties: false },
);
export const UploadPartBody = t.Object(
  { partNumber: t.Integer({ minimum: 1, maximum: 10000 }) },
  { additionalProperties: false },
);
export const UploadDto = t.Object({
  id: Uuid,
  assetId: Uuid,
  status: t.String(),
  sizeBytes: Size,
  partSizeBytes: Size,
  partCount: t.Integer(),
  partConcurrency: t.Integer(),
  expiresAt: t.String({ format: "date-time" }),
  completedAt: t.Nullable(t.String({ format: "date-time" })),
  uploadedBytes: t.String({ pattern: "^[0-9]+$" }),
  parts: t.Array(
    t.Object({
      partNumber: t.Integer(),
      etag: t.String(),
      sizeBytes: t.String(),
    }),
  ),
  failureCode: t.Nullable(t.String()),
  processing: t.Object({
    state: t.String(),
    jobState: t.Nullable(t.String()),
    progressSeconds: t.Integer(),
    attempts: t.Integer(),
    failureCode: t.Nullable(t.String()),
    verifiedReadyAt: t.Nullable(t.String({ format: "date-time" })),
  }),
});
export const UploadPartDto = t.Object({
  partNumber: t.Integer(),
  url: t.Nullable(t.String()),
  expiresAt: t.String({ format: "date-time" }),
  alreadyUploaded: t.Boolean(),
});
