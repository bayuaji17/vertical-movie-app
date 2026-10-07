import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { videos, series, mediaAssets, mediaJobs } from "../../db/schema";
export const source = alias(mediaAssets, "playable_source"),
  poster = alias(mediaAssets, "playable_poster"),
  hls = alias(mediaJobs, "playable_hls"),
  posterJob = alias(mediaJobs, "playable_poster_job");
export const ready = and(
  eq(source.kind, "source"),
  eq(source.state, "ready"),
  isNotNull(source.facts),
  isNotNull(source.sha256),
  isNotNull(source.verifiedReadyAt),
  eq(hls.state, "succeeded"),
  eq(hls.generation, source.generation),
  eq(hls.assetId, source.id),
  isNotNull(hls.outputFiles),
  isNotNull(hls.outputPrefix),
  eq(poster.kind, "poster"),
  eq(poster.state, "ready"),
  isNotNull(poster.facts),
  eq(posterJob.state, "succeeded"),
  eq(posterJob.generation, poster.generation),
  eq(posterJob.assetId, poster.id),
  isNotNull(posterJob.outputFiles),
  isNotNull(posterJob.outputPrefix),
);
export const publishedParent = and(
  eq(series.publicationStatus, "published"),
  isNull(series.archivedAt),
  sql`length(btrim(${series.title}))>0 AND length(btrim(${series.synopsis}))>0`,
);
export const own = and(
  sql`CASE WHEN ${source.facts}->>'durationMs' ~ '^[0-9]+$' THEN (${source.facts}->>'durationMs')::numeric ELSE 0 END BETWEEN 1 AND CASE WHEN ${videos.kind}='episode' THEN 600000 ELSE 1800000 END`,
  eq(videos.publicationStatus, "published"),
  isNull(videos.archivedAt),
  isNotNull(videos.rightsConfirmedAt),
  isNotNull(videos.rightsConfirmedBy),
  sql`length(btrim(${videos.title}))>0 AND length(btrim(${videos.synopsis}))>0`,
);
