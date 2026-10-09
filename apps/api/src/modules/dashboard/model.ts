import { t } from "elysia";
import { Uuid } from "../../shared/content-model";
const Count = t.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const Status = t.Union([
  t.Literal("draft"),
  t.Literal("published"),
  t.Literal("archived"),
  t.Literal("unpublished"),
]);
export const DashboardType = t.Union([
  t.Literal("film"),
  t.Literal("standalone"),
  t.Literal("series"),
  t.Literal("episode"),
]);
const Counts = t.Object(
  {
    total: Count,
    draft: Count,
    published: Count,
    archived: Count,
    unpublished: Count,
  },
  { additionalProperties: false },
);
export const DashboardSummaryDto = t.Object(
  {
    generatedAt: t.String({ format: "date-time" }),
    content: t.Object(
      { film: Counts, standalone: Counts, series: Counts, episode: Counts },
      { additionalProperties: false },
    ),
    media: t.Object(
      { queued: Count, running: Count, retry: Count, failed: Count },
      { additionalProperties: false },
    ),
    latestContent: t.Array(
      t.Object(
        {
          type: t.Union([
            t.Literal("film"),
            t.Literal("standalone"),
            t.Literal("series"),
          ]),
          id: Uuid,
          title: t.String(),
          publicationStatus: Status,
          createdAt: t.String({ format: "date-time" }),
        },
        { additionalProperties: false },
      ),
      { maxItems: 8 },
    ),
    failedMedia: t.Array(
      t.Object(
        {
          jobId: Uuid,
          type: DashboardType,
          id: Uuid,
          title: t.String(),
          role: t.Union([t.Literal("source"), t.Literal("poster")]),
          seriesId: t.Nullable(Uuid),
        },
        { additionalProperties: false },
      ),
      { maxItems: 5 },
    ),
  },
  { additionalProperties: false },
);
export type DashboardSummary = typeof DashboardSummaryDto.static;
export type DashboardContentType = typeof DashboardType.static;
