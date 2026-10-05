import type { PlayableRow } from "../modules/catalog/repository";
import { ContentError } from "./content-error";

export function playbackReadiness(
  row: PlayableRow,
  profile: { provider: string; bucket: string },
) {
  if (
    row.source.provider !== profile.provider ||
    row.source.bucket !== profile.bucket ||
    row.poster.provider !== profile.provider ||
    row.poster.bucket !== profile.bucket
  )
    throw new ContentError(
      "PLAYBACK_PROFILE_CONFLICT",
      "Playback storage profile is unavailable.",
      503,
    );
  if (
    !row.hls.outputPrefix ||
    !new RegExp(
      "^outputs/" + row.source.id + "/" + row.hls.id + "/[a-f0-9-]{36}/$",
    ).test(row.hls.outputPrefix)
  )
    throw new ContentError(
      "PLAYBACK_INVALID_OUTPUT",
      "Playback output identity is invalid.",
      503,
    );
  const duration = Number(row.source.facts?.durationMs);
  if (!Number.isSafeInteger(duration) || duration < 1 || duration > 1800000)
    throw new ContentError(
      "PLAYBACK_INVALID_DURATION",
      "Playback duration is unavailable.",
      503,
    );
  return { durationMs: duration, ttl: Math.ceil((duration * 2) / 1000) };
}

export function posterReadiness(row: PlayableRow) {
  if (
    !row.posterJob.outputFiles?.includes("poster.webp") ||
    !row.posterJob.outputPrefix?.startsWith(
      "outputs/" + row.poster.id + "/" + row.posterJob.id + "/",
    )
  )
    throw new ContentError(
      "PLAYBACK_INVALID_POSTER",
      "Poster is unavailable.",
      503,
    );
}
