import { t } from "elysia";
import {
  EditorialInput,
  MetadataPatch,
  ExpectedVersion,
  EditorialDto,
  Uuid,
  NextCursor,
  ListQueryProperties,
} from "../../shared/content-model";
const fields = { ...EditorialInput, rightsConfirmed: t.Optional(t.Boolean()) };
export const VideoKind = t.Union([
  t.Literal("standalone"),
  t.Literal("movie"),
  t.Literal("episode"),
]);
export const CreateVideoBody = t.Union([
  t.Object(
    {
      ...fields,
      kind: t.Literal("episode"),
      seasonId: Uuid,
      episodeNumber: t.Integer({ minimum: 1, maximum: 2147483647 }),
    },
    { additionalProperties: false },
  ),
  t.Object(
    { ...fields, kind: t.Union([t.Literal("movie"), t.Literal("standalone")]) },
    { additionalProperties: false },
  ),
]);
export const PatchVideoBody = t.Object(
  {
    ...MetadataPatch,
    expectedVersion: ExpectedVersion,
    rightsConfirmed: t.Optional(t.Boolean()),
    seasonId: t.Optional(Uuid),
    episodeNumber: t.Optional(t.Integer({ minimum: 1, maximum: 2147483647 })),
  },
  { additionalProperties: false },
);
export const VideoListQuery = t.Object(
  {
    ...ListQueryProperties,
    kind: t.Optional(VideoKind),
    seriesId: t.Optional(Uuid),
    seasonId: t.Optional(Uuid),
  },
  { additionalProperties: false },
);
export const VideoDto = t.Object({
  ...EditorialDto,
  publicationStatus: t.Union([
    t.Literal("draft"),
    t.Literal("published"),
    t.Literal("archived"),
  ]),
  sourceAvailability: t.Union([
    t.Literal("not_uploaded"),
    t.Literal("available"),
    t.Literal("deleting"),
    t.Literal("deleted"),
  ]),
  kind: VideoKind,
  seasonId: t.Nullable(Uuid),
  episodeNumber: t.Nullable(t.Integer()),
  rightsConfirmedAt: t.Nullable(t.String()),
});
export const VideoDetailDto = t.Object({
  ...VideoDto.properties,
  series: t.Nullable(
    t.Object({ id: Uuid, title: t.String(), slug: t.String() }),
  ),
  season: t.Nullable(
    t.Object({
      id: Uuid,
      seasonNumber: t.Integer(),
      title: t.Nullable(t.String()),
    }),
  ),
  effectiveGenres: t.Array(
    t.Object({ id: Uuid, name: t.String(), slug: t.String() }),
  ),
});
export const VideoListDto = t.Object({
  items: t.Array(VideoDetailDto),
  nextCursor: NextCursor,
});
export type CreateVideoInput = typeof CreateVideoBody.static;
export type PatchVideoInput = typeof PatchVideoBody.static;
export type VideoListInput = typeof VideoListQuery.static;
