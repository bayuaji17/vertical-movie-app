import { t } from "elysia";
import {
  EditorialInput,
  MetadataPatch,
  ExpectedVersion,
  EditorialDto,
  AuditDto,
  NextCursor,
} from "../../shared/content-model";
export const CreateSeriesBody = t.Object(
  {
    ...EditorialInput,
    completionStatus: t.Optional(
      t.Union([t.Literal("ongoing"), t.Literal("completed")]),
    ),
  },
  { additionalProperties: false },
);
export const PatchSeriesBody = t.Object(
  {
    ...MetadataPatch,
    expectedVersion: ExpectedVersion,
    completionStatus: t.Optional(
      t.Union([t.Literal("ongoing"), t.Literal("completed")]),
    ),
  },
  { additionalProperties: false },
);
export const SeasonDto = t.Object({
  ...AuditDto,
  seriesId: t.String(),
  seasonNumber: t.Integer(),
  title: t.Nullable(t.String()),
  description: t.Nullable(t.String()),
  releaseYear: t.Nullable(t.Integer()),
  releaseDate: t.Nullable(t.String()),
});
export const SeriesDto = t.Object({
  ...EditorialDto,
  completionStatus: t.Union([t.Literal("ongoing"), t.Literal("completed")]),
});
export const SeriesDetailDto = t.Object({
  ...SeriesDto.properties,
  seasons: t.Array(SeasonDto),
});
export const SeriesListDto = t.Object({
  items: t.Array(SeriesDto),
  nextCursor: NextCursor,
});
export const CreateSeriesResponse = t.Object({
  series: SeriesDto,
  defaultSeason: SeasonDto,
});
export type CreateSeriesInput = typeof CreateSeriesBody.static;
export type PatchSeriesInput = typeof PatchSeriesBody.static;
export const SeasonFields = {
  seasonNumber: t.Integer({ minimum: 1, maximum: 2147483647 }),
  title: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
  description: t.Optional(t.Nullable(t.String({ maxLength: 10000 }))),
  releaseYear: EditorialInput.releaseYear,
  releaseDate: EditorialInput.releaseDate,
};
export const CreateSeasonBody = t.Object(SeasonFields, {
  additionalProperties: false,
});
export const PatchSeasonBody = t.Object(
  {
    ...SeasonFields,
    seasonNumber: t.Optional(SeasonFields.seasonNumber),
    expectedVersion: ExpectedVersion,
  },
  { additionalProperties: false },
);
export type CreateSeasonInput = typeof CreateSeasonBody.static;
export type PatchSeasonInput = typeof PatchSeasonBody.static;
