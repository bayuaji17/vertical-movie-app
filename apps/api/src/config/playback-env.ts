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
