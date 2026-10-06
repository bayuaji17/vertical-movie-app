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
    expectedSha256: t.Optional(t.String({ pattern: "^[a-f0-9]{64}$" })),
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
export const ProcessPosterBody = t.Object({}, { additionalProperties: false });
export const UploadDto = t.Object({
  id: Uuid,
  assetId: Uuid,
  processingMode: t.Union([t.Literal("worker"), t.Literal("request")]),
  canProcessPoster: t.Boolean(),
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
export const OwnerParams = t.Object(
  {
    ownerType: t.Union([t.Literal("video"), t.Literal("series")]),
    ownerId: Uuid,
  },
  { additionalProperties: false },
);
const UploadDescriptor = t.Object({
  id: Uuid,
  assetId: Uuid,
  status: t.String(),
  filename: t.String(),
  contentType: t.String(),
  sizeBytes: Size,
  partSizeBytes: Size,
  partCount: t.Integer(),
  expiresAt: t.String({ format: "date-time" }),
  completedAt: t.Nullable(t.String({ format: "date-time" })),
  failureCode: t.Nullable(t.String()),
  expectedSha256: t.Nullable(t.String()),
  canResume: t.Boolean(),
  processingMode: t.Union([t.Literal("worker"), t.Literal("request")]),
  canProcessPoster: t.Boolean(),
});
const CurrentAsset = t.Object({
  id: Uuid,
  state: t.String(),
  sizeBytes: Size,
  contentType: t.String(),
  originalAvailable: t.Boolean(),
  verifiedReadyAt: t.Nullable(t.String({ format: "date-time" })),
  width: t.Nullable(t.Integer()),
  height: t.Nullable(t.Integer()),
  durationMs: t.Nullable(t.Integer()),
  processing: UploadDto.properties.processing,
});
const RoleInventory = t.Object({
  current: t.Nullable(CurrentAsset),
  active: t.Nullable(UploadDescriptor),
  lastAttempt: t.Nullable(UploadDescriptor),
  busy: t.Boolean(),
  canProcessPoster: t.Boolean(),
});
const Rules = t.Object({
  maxBytes: Size,
  formats: t.Array(
    t.Object({ extension: t.String(), contentTypes: t.Array(t.String()) }),
  ),
});
export const OwnerMediaDto = t.Object({
  ownerType: OwnerParams.properties.ownerType,
  ownerId: Uuid,
  rowVersion: t.Integer(),
  status: t.String(),
  canUpload: t.Boolean(),
  canPreview: t.Boolean(),
  source: t.Nullable(RoleInventory),
  poster: RoleInventory,
  config: t.Object({
    partConcurrency: t.Integer(),
    sessionTtlSeconds: t.Integer(),
    partUrlTtlSeconds: t.Integer(),
    source: Rules,
    poster: Rules,
    maxDurationSeconds: t.Integer(),
    minVideoWidth: t.Integer(),
    maxVideoWidth: t.Integer(),
    minPosterWidth: t.Integer(),
    minPosterHeight: t.Integer(),
  }),
});
