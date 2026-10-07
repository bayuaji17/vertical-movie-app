import { t } from "elysia";
import { ExpectedVersion, Uuid } from "../../shared/content-model";
import { VideoKind } from "../videos/model";
export const PublicationReadinessDto = t.Object(
  {
    videoId: Uuid,
    kind: VideoKind,
    rowVersion: ExpectedVersion,
    publicationStatus: t.Union([
      t.Literal("draft"),
      t.Literal("published"),
      t.Literal("archived"),
    ]),
    archivedAt: t.Nullable(t.String({ format: "date-time" })),
    canPublish: t.Boolean(),
    checks: t.Array(
      t.Object(
        {
          code: t.Union([
            t.Literal("ACTIVE_DRAFT"),
            t.Literal("TITLE"),
            t.Literal("SYNOPSIS"),
            t.Literal("RIGHTS"),
            t.Literal("VERIFIED_MEDIA"),
            t.Literal("NO_ACTIVE_UPLOAD"),
            t.Literal("ACTIVE_PARENTS"),
          ]),
          status: t.Union([
            t.Literal("passed"),
            t.Literal("blocked"),
            t.Literal("not-applicable"),
          ]),
        },
        { additionalProperties: false },
      ),
      { minItems: 7, maxItems: 7 },
    ),
  },
  { additionalProperties: false },
);
export type PublicationReadiness = typeof PublicationReadinessDto.static;
export const PublishBody = t.Object(
  { expectedVersion: ExpectedVersion, idempotencyKey: Uuid },
  { additionalProperties: false },
);
export type PublishInput = typeof PublishBody.static;
export const PublicationDto = t.Object({
  id: Uuid,
  publicationStatus: t.Literal("published"),
  rowVersion: t.Integer(),
  publishedAt: t.String({ format: "date-time" }),
  firstPublishedAt: t.String({ format: "date-time" }),
});
export type PublicationResult = typeof PublicationDto.static;
