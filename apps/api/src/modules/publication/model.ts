import { t } from "elysia";
import { ExpectedVersion, Uuid } from "../../shared/content-model";
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
