import { t } from "elysia";
import { Uuid } from "../../shared/content-model";

export const ContentType = t.Union([
  t.Literal("film"),
  t.Literal("standalone"),
  t.Literal("series"),
]);
// `active` hides archived items (the default); `all` includes them.
export const ContentStatusFilter = t.Union([
  t.Literal("active"),
  t.Literal("draft"),
  t.Literal("published"),
  t.Literal("archived"),
  t.Literal("all"),
]);
export const ContentSort = t.Union([
  t.Literal("updated"),
  t.Literal("created"),
  t.Literal("title"),
  t.Literal("status"),
]);
export const ContentOrder = t.Union([t.Literal("asc"), t.Literal("desc")]);
export const ContentPageQuery = t.Object(
  {
    type: ContentType,
    page: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,6}$" })),
    pageSize: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,2}$" })),
    search: t.Optional(t.String({ maxLength: 200 })),
    includeArchived: t.Optional(
      t.Union([t.Literal("true"), t.Literal("false")]),
    ),
    status: t.Optional(ContentStatusFilter),
    sort: t.Optional(ContentSort),
    order: t.Optional(ContentOrder),
  },
  { additionalProperties: false },
);
export const ContentPageItem = t.Object({
  type: ContentType,
  id: Uuid,
  title: t.String(),
  slug: t.String(),
  publicationStatus: t.Union([
    t.Literal("draft"),
    t.Literal("published"),
    t.Literal("archived"),
    t.Literal("unpublished"),
  ]),
  archivedAt: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
  rowVersion: t.Integer(),
  // Row summary for the admin list; all optional so older clients keep working.
  releaseYear: t.Optional(t.Nullable(t.Integer())),
  genres: t.Optional(t.Array(t.String(), { maxItems: 3 })),
  genreCount: t.Optional(t.Integer({ minimum: 0 })),
  // Film/Standalone only: what is still missing before it can be published.
  mediaState: t.Optional(
    t.Union([
      t.Literal("needs-video"),
      t.Literal("needs-cover"),
      t.Literal("uploading"),
      t.Literal("processing"),
      t.Literal("failed"),
      t.Literal("ready"),
    ]),
  ),
  // Series only; archived seasons and episodes are not counted.
  seasonCount: t.Optional(t.Integer({ minimum: 0 })),
  episodeCount: t.Optional(t.Integer({ minimum: 0 })),
});
export const ContentPageDto = t.Object({
  items: t.Array(ContentPageItem),
  total: t.Integer({ minimum: 0 }),
  page: t.Integer({ minimum: 1 }),
  pageSize: t.Integer({ minimum: 1, maximum: 100 }),
  totalPages: t.Integer({ minimum: 0 }),
});
export type ContentPageInput = typeof ContentPageQuery.static;
export type ContentPage = typeof ContentPageDto.static;
