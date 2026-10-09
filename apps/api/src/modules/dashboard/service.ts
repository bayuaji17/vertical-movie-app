import { getSchemaValidator } from "elysia";
import { DashboardSummaryDto } from "./model";
import { unavailable } from "../../shared/content-error";
import type { DashboardSummary } from "./model";
import type { DashboardRepository } from "./repository";
const validator = getSchemaValidator(DashboardSummaryDto, {
  normalize: false,
  additionalProperties: false,
});
function count(value: string | number | bigint): number {
  if (!["number", "string", "bigint"].includes(typeof value)) unavailable();
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0))
    unavailable();
  if (typeof value === "string" && !/^\d+$/.test(value)) unavailable();
  const integer = BigInt(value);
  if (integer < 0n || integer > BigInt(Number.MAX_SAFE_INTEGER)) unavailable();
  return Number(integer);
}
function timestamp(value: Date | string) {
  return new Date(value).toISOString();
}
export class DashboardService {
  constructor(private readonly repository?: DashboardRepository) {}
  async summary(): Promise<DashboardSummary> {
    try {
      const snapshot = await (this.repository ?? unavailable()).read();
      const empty = () => ({
        total: 0,
        draft: 0,
        published: 0,
        archived: 0,
        unpublished: 0,
      });
      const content = {
        film: empty(),
        standalone: empty(),
        series: empty(),
        episode: empty(),
      };
      for (const row of snapshot.content) {
        if (
          !Object.prototype.hasOwnProperty.call(content, row.type) ||
          !["draft", "published", "archived", "unpublished"].includes(
            row.status,
          )
        )
          unavailable();
        const partition = content[row.type],
          n = count(row.count);
        if (row.status === "unpublished" && row.type !== "series")
          unavailable();
        partition[row.status as keyof Omit<typeof partition, "total">] = n;
        partition.total = count(BigInt(partition.total) + BigInt(n));
      }
      const media = { queued: 0, running: 0, retry: 0, failed: 0 };
      for (const row of snapshot.media) {
        if (!Object.prototype.hasOwnProperty.call(media, row.state))
          unavailable();
        media[row.state as keyof typeof media] = count(row.count);
      }
      const result: DashboardSummary = {
        generatedAt: timestamp(snapshot.generatedAt),
        content,
        media,
        latestContent: snapshot.latestContent.map((row) => ({
          type: row.type,
          id: row.id,
          title: row.title,
          publicationStatus: row.publicationStatus,
          createdAt: timestamp(row.createdAt),
        })),
        failedMedia: snapshot.failedMedia.map((row) => ({
          jobId: row.jobId,
          type: row.type,
          id: row.id,
          title: row.title,
          role: row.role,
          seriesId: row.seriesId,
        })),
      };
      if (!validator.Check(result)) unavailable();
      return result;
    } catch {
      return unavailable();
    }
  }
}
