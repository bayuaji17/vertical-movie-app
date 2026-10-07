import { t } from "elysia";
import { Uuid, NextCursor } from "../../shared/content-model";

export const HomeKindSchema = t.Union([
  t.Literal("movie"),
  t.Literal("standalone"),
  t.Literal("series"),
]);
export const HomeQuerySchema = t.Object(
  {
    limit: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,2}$" })),
    cursor: t.Optional(t.String({ minLength: 1, maxLength: 2048 })),
    search: t.Optional(
      t.String({
        maxLength: 800,
        description:
          "Up to 200 Unicode code points; literal title/synopsis search.",
      }),
    ),
    kind: t.Optional(HomeKindSchema),
    genreId: t.Optional(Uuid),
  },
  { additionalProperties: false },
);
export const HomeGenresQuery = t.Object(
  {
    limit: HomeQuerySchema.properties.limit,
    cursor: HomeQuerySchema.properties.cursor,
  },
  { additionalProperties: false },
);
export const HomePosterParams = t.Object(
  { kind: HomeKindSchema, id: Uuid },
  { additionalProperties: false },
);
export const HomeGenre = t.Object(
  { id: Uuid, slug: t.String(), name: t.String() },
  { additionalProperties: false },
);
const common = {
  id: Uuid,
  slug: t.String(),
  title: t.String({ minLength: 1 }),
  synopsis: t.String({ minLength: 1 }),
  publishedAt: t.String({
    pattern: "^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{6}Z$",
  }),
  genres: t.Array(HomeGenre),
  posterPath: t.String({
    pattern: "^/catalog/(movie|standalone|series)/[0-9a-f-]{36}/poster$",
  }),
};
export const HomeMovie = t.Object(
  {
    ...common,
    kind: t.Literal("movie"),
    durationMs: t.Integer({ minimum: 1, maximum: 1800000 }),
  },
  { additionalProperties: false },
);
export const HomeStandalone = t.Object(
  {
    ...common,
    kind: t.Literal("standalone"),
    durationMs: t.Integer({ minimum: 1, maximum: 1800000 }),
  },
  { additionalProperties: false },
);
export const HomeSeries = t.Object(
  {
    ...common,
    kind: t.Literal("series"),
    episodeCount: t.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export const HomeItem = t.Union([HomeMovie, HomeStandalone, HomeSeries]);
export const HomeFreshness = t.Integer({ minimum: 0, maximum: 60000 });
export const HomePageDto = t.Object(
  {
    items: t.Array(HomeItem),
    total: t.Integer({ minimum: 0 }),
    nextCursor: NextCursor,
    freshForMs: HomeFreshness,
  },
  { additionalProperties: false },
);
export const HomeGenresDto = t.Object(
  {
    items: t.Array(HomeGenre),
    nextCursor: NextCursor,
    freshForMs: HomeFreshness,
  },
  { additionalProperties: false },
);
export const HomeFeaturedDto = t.Object(
  { item: t.Nullable(HomeMovie), freshForMs: HomeFreshness },
  { additionalProperties: false },
);
export type PublicHomeItem = typeof HomeItem.static;
export type PublicHomePage = typeof HomePageDto.static;
export type PublicHomeGenre = typeof HomeGenre.static;
