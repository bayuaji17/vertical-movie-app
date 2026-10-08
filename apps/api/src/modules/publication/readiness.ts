import { and, eq, inArray } from "drizzle-orm";
import {
  uploadSessions,
  videos,
  series,
  mediaAssets,
  mediaJobs,
} from "../../db/schema";
import type { ContentConnection } from "../../shared/content-db";
import { ContentError } from "../../shared/content-error";
import { CatalogStore } from "../catalog/repository";
import { VideosStore } from "../videos/repository";

export const readinessCodes = [
  "ACTIVE_DRAFT",
  "TITLE",
  "SYNOPSIS",
  "RIGHTS",
  "VERIFIED_MEDIA",
  "NO_ACTIVE_UPLOAD",
  "ACTIVE_PARENTS",
] as const;
export type ReadinessCode = (typeof readinessCodes)[number];
export type ReadinessCheck = {
  code: ReadinessCode;
  status: "passed" | "blocked" | "not-applicable";
};
type Video = Pick<
  typeof videos.$inferSelect,
  | "kind"
  | "publicationStatus"
  | "archivedAt"
  | "title"
  | "synopsis"
  | "rightsConfirmedAt"
  | "rightsConfirmedBy"
  | "rowVersion"
>;
export type VideoPublicationEvidence = {
  video: Video;
  mediaReady: boolean;
  durationMs: unknown;
  uploadBusy: boolean;
  parentsActive: boolean;
};

// readyForPublish remains the canonical provenance/generation predicate. Source
// retention state deliberately does not affect publication eligibility.
export function assessVideoPublication(evidence: VideoPublicationEvidence) {
  const { video, mediaReady, durationMs, uploadBusy, parentsActive } = evidence;
  const duration = Number(durationMs);
  const passed: Record<ReadinessCode, boolean> = {
    ACTIVE_DRAFT: !video.archivedAt && video.publicationStatus === "draft",
    TITLE: !!video.title.trim(),
    SYNOPSIS: !!video.synopsis?.trim(),
    RIGHTS: !!video.rightsConfirmedAt && !!video.rightsConfirmedBy,
    VERIFIED_MEDIA:
      mediaReady &&
      Number.isSafeInteger(duration) &&
      duration > 0 &&
      duration <= (video.kind === "episode" ? 600000 : 1800000),
    NO_ACTIVE_UPLOAD: !uploadBusy,
    ACTIVE_PARENTS: parentsActive,
  };
  const checks: ReadinessCheck[] = readinessCodes.map((code) => ({
    code,
    status:
      code === "ACTIVE_PARENTS" && video.kind !== "episode"
        ? "not-applicable"
        : passed[code]
          ? "passed"
          : "blocked",
  }));
  return { canPublish: checks.every((c) => c.status !== "blocked"), checks };
}

export function assertVideoPublication(
  evidence: VideoPublicationEvidence,
  expectedVersion: number,
) {
  const { checks } = assessVideoPublication(evidence);
  const blocked = (code: ReadinessCode) =>
    checks.some((c) => c.code === code && c.status === "blocked");
  if (blocked("ACTIVE_DRAFT"))
    throw new ContentError(
      "PUBLICATION_STATE_CONFLICT",
      "Only an active draft can be published.",
    );
  if (evidence.video.rowVersion !== expectedVersion)
    throw new ContentError("CONTENT_VERSION_CONFLICT", "Content has changed.");
  if (blocked("TITLE") || blocked("SYNOPSIS"))
    throw new ContentError(
      "PUBLICATION_NOT_READY",
      "Title and synopsis are required.",
    );
  if (blocked("NO_ACTIVE_UPLOAD"))
    throw new ContentError(
      "PUBLICATION_MEDIA_BUSY",
      "Finish or abort the active upload before publishing.",
    );
  if (blocked("VERIFIED_MEDIA") || blocked("RIGHTS"))
    throw new ContentError(
      "PUBLICATION_NOT_READY",
      "Verified HLS, poster and rights confirmation are required.",
    );
}

export interface PublicationEvidenceReader {
  read(
    video: typeof videos.$inferSelect,
    parentsActive?: boolean,
  ): Promise<VideoPublicationEvidence>;
}
export class PublicationEvidenceStore implements PublicationEvidenceReader {
  constructor(private readonly db: ContentConnection) {}
  async read(video: typeof videos.$inferSelect, parentsActive?: boolean) {
    const ready = await new CatalogStore(this.db).readyForPublish(video.id);
    const busy = await this.db
      .select({ id: uploadSessions.id })
      .from(uploadSessions)
      .where(
        and(
          eq(uploadSessions.videoId, video.id),
          inArray(uploadSessions.status, [
            "initializing",
            "pending",
            "completing",
            "aborting",
          ]),
        ),
      )
      .limit(1);
    if (parentsActive === undefined) {
      const [parent] = video.seasonId
        ? await new VideosStore(this.db).parents([video.seasonId])
        : [];
      parentsActive =
        !video.seasonId ||
        (!!parent && !parent.season.archivedAt && !parent.parent.archivedAt);
    }
    return {
      video,
      mediaReady: !!ready,
      durationMs: ready?.source.facts?.durationMs,
      uploadBusy: busy.length > 0,
      parentsActive,
    };
  }
}

export const seriesReadinessCodes = [
  "ACTIVE_DRAFT",
  "TITLE",
  "SYNOPSIS",
  "VERIFIED_POSTER",
  "PUBLISHED_EPISODE",
  "NO_ACTIVE_UPLOAD",
] as const;
export type SeriesReadinessCode = (typeof seriesReadinessCodes)[number];
export type SeriesPublicationEvidence = {
  series: Pick<
    typeof series.$inferSelect,
    "publicationStatus" | "archivedAt" | "title" | "synopsis" | "rowVersion"
  >;
  posterReady: boolean;
  publishedEpisodeReady: boolean;
  uploadBusy: boolean;
};
export function assessSeriesPublication(evidence: SeriesPublicationEvidence) {
  const row = evidence.series;
  const passed: Record<SeriesReadinessCode, boolean> = {
    ACTIVE_DRAFT: !row.archivedAt && row.publicationStatus === "draft",
    TITLE: !!row.title.trim(),
    SYNOPSIS: !!row.synopsis?.trim(),
    VERIFIED_POSTER: evidence.posterReady,
    PUBLISHED_EPISODE: evidence.publishedEpisodeReady,
    NO_ACTIVE_UPLOAD: !evidence.uploadBusy,
  };
  const checks = seriesReadinessCodes.map((code) => ({
    code,
    status: passed[code] ? ("passed" as const) : ("blocked" as const),
  }));
  return { canPublish: checks.every((c) => c.status !== "blocked"), checks };
}
export function assertSeriesPublication(
  evidence: SeriesPublicationEvidence,
  expectedVersion: number,
) {
  const { checks } = assessSeriesPublication(evidence),
    blocked = (code: SeriesReadinessCode) =>
      checks.some((c) => c.code === code && c.status === "blocked");
  if (blocked("ACTIVE_DRAFT"))
    throw new ContentError(
      "PUBLICATION_STATE_CONFLICT",
      "Only an active draft can be published.",
    );
  if (evidence.series.rowVersion !== expectedVersion)
    throw new ContentError("CONTENT_VERSION_CONFLICT", "Content has changed.");
  if (blocked("TITLE") || blocked("SYNOPSIS"))
    throw new ContentError(
      "PUBLICATION_NOT_READY",
      "Title and synopsis are required.",
    );
  if (blocked("NO_ACTIVE_UPLOAD"))
    throw new ContentError(
      "PUBLICATION_MEDIA_BUSY",
      "Finish or abort the active upload before publishing.",
    );
  if (blocked("VERIFIED_POSTER") || blocked("PUBLISHED_EPISODE"))
    throw new ContentError(
      "PUBLICATION_NOT_READY",
      "A ready poster and published playable episode are required.",
    );
}
// Both GET and locked POST consume the existing Series poster/generation and
// canonical CatalogStore.playable child predicate. No new publication policy.
export class SeriesPublicationEvidenceStore {
  constructor(private readonly db: ContentConnection) {}
  async read(
    row: typeof series.$inferSelect,
  ): Promise<SeriesPublicationEvidence> {
    const busy = await this.db
      .select({ id: uploadSessions.id })
      .from(uploadSessions)
      .where(
        and(
          eq(uploadSessions.seriesId, row.id),
          inArray(uploadSessions.status, [
            "initializing",
            "pending",
            "completing",
            "aborting",
          ]),
        ),
      )
      .limit(1);
    const [poster] = await this.db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .innerJoin(mediaJobs, eq(mediaAssets.readyJobId, mediaJobs.id))
      .where(
        and(
          eq(
            mediaAssets.id,
            row.posterAssetId ?? "00000000-0000-0000-0000-000000000000",
          ),
          eq(mediaAssets.seriesId, row.id),
          eq(mediaAssets.kind, "poster"),
          eq(mediaAssets.state, "ready"),
          eq(mediaJobs.state, "succeeded"),
          eq(mediaJobs.assetId, mediaAssets.id),
          eq(mediaJobs.generation, mediaAssets.generation),
        ),
      );
    const children = await new CatalogStore(this.db).playable({
      seriesId: row.id,
      includeSeriesDraft: true,
      limit: 1,
    });
    return {
      series: row,
      uploadBusy: busy.length > 0,
      posterReady: !!poster,
      publishedEpisodeReady: children.length > 0,
    };
  }
}
