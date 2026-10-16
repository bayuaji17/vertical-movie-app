export function loadPlaybackBaseUrl(
  value: string | undefined,
  webOrigin: string,
) {
  const raw = value?.trim() || webOrigin + "/api";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("MEDIA_PLAYBACK_BASE_URL is invalid.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.origin !== webOrigin ||
    url.pathname !== "/api" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error(
      "MEDIA_PLAYBACK_BASE_URL must be the web origin with /api path.",
    );
  return url.href.replace(/\/$/, "");
}

// Presigned URL lifetimes (seconds). SigV4 allows 7 days at most.
export const urlLifetimeBounds = { min: 60, max: 604800 } as const;
export type UrlLifetimes = { posterSeconds: number; hlsMinSeconds: number };
export const defaultUrlLifetimes: UrlLifetimes = {
  posterSeconds: 86400,
  hlsMinSeconds: 3600,
};
function lifetime(name: string, value: string | undefined, fallback: number) {
  const raw = value?.trim();
  if (!raw) return fallback;
  const seconds = Number(raw);
  if (
    !/^[0-9]+$/.test(raw) ||
    seconds < urlLifetimeBounds.min ||
    seconds > urlLifetimeBounds.max
  )
    throw new Error(
      `${name} must be a whole number from ${urlLifetimeBounds.min} to ${urlLifetimeBounds.max} seconds.`,
    );
  return seconds;
}
/**
 * `MEDIA_POSTER_URL_TTL_SECONDS` (default 24 h): how long a poster URL stays valid.
 * `MEDIA_HLS_URL_TTL_SECONDS` (default 1 h): the minimum for playlist/segment URLs;
 * the effective lifetime is max(2 × duration, this value).
 */
export function loadUrlLifetimes(
  source: Record<string, string | undefined> = Bun.env,
): UrlLifetimes {
  return {
    posterSeconds: lifetime(
      "MEDIA_POSTER_URL_TTL_SECONDS",
      source.MEDIA_POSTER_URL_TTL_SECONDS,
      defaultUrlLifetimes.posterSeconds,
    ),
    hlsMinSeconds: lifetime(
      "MEDIA_HLS_URL_TTL_SECONDS",
      source.MEDIA_HLS_URL_TTL_SECONDS,
      defaultUrlLifetimes.hlsMinSeconds,
    ),
  };
}
