import { t } from "elysia";
import { Uuid, NextCursor } from "../../shared/content-model";
import { HomeKindSchema, HomeItem } from "./home-model";
import { SlugParams, PublicVideoDto } from "./model";
export const WatchMetadataDto = t.Object(
  {
    item: PublicVideoDto,
    freshForMs: t.Integer({ minimum: 0, maximum: 60000 }),
  },
  { additionalProperties: false },
);

export const DetailParams = t.Object(
  { kind: HomeKindSchema, slug: SlugParams.properties.slug },
  { additionalProperties: false },
);
export const EpisodeQuery = t.Object(
  {
    limit: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,2}$" })),
    cursor: t.Optional(t.String({ minLength: 1, maxLength: 2048 })),
  },
  { additionalProperties: false },
);
export const ContentDetailDto = t.Object(
  { item: HomeItem, freshForMs: t.Integer({ minimum: 0, maximum: 60000 }) },
  { additionalProperties: false },
);
export const PublicEpisodeDto = t.Object(
  {
    id: Uuid,
    slug: SlugParams.properties.slug,
    title: t.String({ minLength: 1 }),
    synopsis: t.String({ minLength: 1 }),
    durationMs: t.Integer({ minimum: 1, maximum: 1800000 }),
    seasonNumber: t.Integer({ minimum: 1 }),
    episodeNumber: t.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export const EpisodesDto = t.Object(
  {
    items: t.Array(PublicEpisodeDto),
    total: t.Integer({ minimum: 0 }),
    nextCursor: NextCursor,
    freshForMs: t.Integer({ minimum: 0, maximum: 60000 }),
  },
  { additionalProperties: false },
);
export type PublicEpisode = typeof PublicEpisodeDto.static;
