import { and, eq } from "drizzle-orm";
import { series, videos } from "../../db/schema";
import type { ContentDatabase } from "../../shared/content-db";
import { poster, posterJob, posterReady } from "../catalog/visibility";
import type { ContentPageInput } from "./model";

export type CoverRow = { provider: string; bucket: string; key: string };
export interface CoverStore {
  cover(
    type: ContentPageInput["type"],
    id: string,
  ): Promise<CoverRow | undefined>;
}

/**
 * The verified cover of one item, whatever its publication status (admin only).
 * It uses the same `posterReady` predicate as the publish check and catalog.
 */
export function createCoverStore(db: ContentDatabase): CoverStore {
  const columns = {
    provider: poster.provider,
    bucket: poster.bucket,
    prefix: posterJob.outputPrefix,
  };
  return {
    async cover(type, id) {
      const [row] =
        type === "series"
          ? await db
              .select(columns)
              .from(series)
              .innerJoin(poster, eq(series.posterAssetId, poster.id))
              .innerJoin(posterJob, eq(poster.readyJobId, posterJob.id))
              .where(and(eq(series.id, id), posterReady))
              .limit(1)
          : await db
              .select(columns)
              .from(videos)
              .innerJoin(poster, eq(videos.posterAssetId, poster.id))
              .innerJoin(posterJob, eq(poster.readyJobId, posterJob.id))
              .where(
                and(
                  eq(videos.id, id),
                  eq(videos.kind, type === "film" ? "movie" : "standalone"),
                  posterReady,
                ),
              )
              .limit(1);
      if (!row?.prefix) return undefined;
      return {
        provider: row.provider,
        bucket: row.bucket,
        key: coverKey(row.prefix),
      };
    },
  };
}
/** The object that holds the full-size cover inside a job's output prefix. */
export const coverKey = (prefix: string) => `${prefix}poster.webp`;
