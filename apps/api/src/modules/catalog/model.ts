import { t } from "elysia";
import { Uuid, NextCursor } from "../../shared/content-model";
import { VideoKind } from "../videos/model";
export const CatalogKinds = t.Union([
  t.Literal("movie"),
  t.Literal("standalone"),
  t.Literal("movie,standalone"),
  t.Literal("standalone,movie"),
]);
export const CatalogQuery = t.Object(
  {
    limit: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,2}$" })),
    cursor: t.Optional(t.String({ maxLength: 2048 })),
    kinds: t.Optional(CatalogKinds),
  },
  { additionalProperties: false },
);
export type CatalogInput = typeof CatalogQuery.static;
export type CatalogKind = "movie" | "standalone";
export const SlugParams = t.Object(
  { slug: t.String({ pattern: "^[a-z0-9]+(-[a-z0-9]+)*$", maxLength: 180 }) },
  { additionalProperties: false },
);
export const PublicVideoDto = t.Object({
  id: Uuid,
  slug: t.String(),
  title: t.String(),
  synopsis: t.String(),
  kind: VideoKind,
  durationMs: t.Integer(),
  seasonNumber: t.Nullable(t.Integer()),
  episodeNumber: t.Nullable(t.Integer()),
  seriesSlug: t.Nullable(t.String()),
});
export const PublicVideoListDto = t.Object({
  items: t.Array(PublicVideoDto),
  nextCursor: NextCursor,
});
export type PublicVideo = typeof PublicVideoDto.static;
export const PublicSeriesDto = t.Object({
  id: Uuid,
  slug: t.String(),
  title: t.String(),
  synopsis: t.String(),
  playableEpisodeCount: t.Integer(),
});
export const PublicSeriesListDto = t.Object({
  items: t.Array(PublicSeriesDto),
});
