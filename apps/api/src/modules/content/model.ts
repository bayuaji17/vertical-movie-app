import { t } from "elysia";
import { Uuid } from "../../shared/content-model";

export const ContentType = t.Union([
  t.Literal("film"),
  t.Literal("standalone"),
  t.Literal("series"),
]);
export const ContentPageQuery = t.Object(
  {
    type: ContentType,
    page: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,6}$" })),
    pageSize: t.Optional(t.String({ pattern: "^[1-9][0-9]{0,2}$" })),
    search: t.Optional(t.String({ maxLength: 200 })),
    includeArchived: t.Optional(
      t.Union([t.Literal("true"), t.Literal("false")]),
    ),
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
