import { t } from "elysia";
export const Uuid = t.String({ format: "uuid" });
export const NullableText = (maxLength: number) =>
  t.Nullable(t.String({ maxLength }));
export const GenreIds = t.Array(Uuid, { uniqueItems: true, maxItems: 100 });
export const EditorialInput = {
  title: t.String({ minLength: 1, maxLength: 200 }),
  slug: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 180,
      pattern: "^[a-z0-9]+(-[a-z0-9]+)*$",
    }),
  ),
  originalTitle: t.Optional(NullableText(200)),
  synopsis: t.Optional(NullableText(500)),
  description: t.Optional(NullableText(10000)),
  originalLanguage: t.Optional(NullableText(35)),
  releaseYear: t.Optional(
    t.Nullable(t.Integer({ minimum: 1800, maximum: 9999 })),
  ),
  releaseDate: t.Optional(t.Nullable(t.String({ format: "date" }))),
  genreIds: t.Optional(GenreIds),
};
export const MetadataPatch = {
  ...EditorialInput,
  title: t.Optional(EditorialInput.title),
};
export const ExpectedVersion = t.Integer({ minimum: 1, maximum: 2147483646 });
export const IdParams = t.Object({ id: Uuid }, { additionalProperties: false });
export const ArchiveBody = t.Object(
  { expectedVersion: ExpectedVersion },
  { additionalProperties: false },
);
export const ListQueryProperties = {
  limit: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,2}$" })),
  cursor: t.Optional(t.String({ maxLength: 2048 })),
  search: t.Optional(t.String({ maxLength: 200 })),
  includeArchived: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
};
export const ListQuery = t.Object(ListQueryProperties, {
  additionalProperties: false,
});
export const PublicationStatus = t.Union([
  t.Literal("draft"),
  t.Literal("published"),
  t.Literal("unpublished"),
]);
export const AuditDto = {
  id: Uuid,
  rowVersion: t.Integer(),
  createdAt: t.String(),
  updatedAt: t.String(),
  archivedAt: t.Nullable(t.String()),
};
export const EditorialDto = {
  ...AuditDto,
  slug: t.String(),
  title: t.String(),
  originalTitle: t.Nullable(t.String()),
  synopsis: t.Nullable(t.String()),
  description: t.Nullable(t.String()),
  originalLanguage: t.Nullable(t.String()),
  releaseYear: t.Nullable(t.Integer()),
  releaseDate: t.Nullable(t.String()),
  publicationStatus: PublicationStatus,
  firstPublishedAt: t.Nullable(t.String()),
  publishedAt: t.Nullable(t.String()),
  genreIds: GenreIds,
};
export const ErrorResponse = t.Object({
  error: t.Object({
    code: t.String(),
    message: t.String(),
    requestId: t.String(),
  }),
});
export const ErrorResponses = {
  401: ErrorResponse,
  403: ErrorResponse,
  404: ErrorResponse,
  409: ErrorResponse,
  422: ErrorResponse,
  500: ErrorResponse,
  503: ErrorResponse,
};
export const NextCursor = t.Nullable(t.String());
