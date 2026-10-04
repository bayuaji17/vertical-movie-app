import { ContentError } from "../../shared/content-error";
export function rewriteManifest(
  text: string,
  current: string,
  allowed: string[],
  variantUrl: (index: string) => string,
  sign: (relative: string) => string,
) {
  function fail(): never {
    throw new ContentError(
      "PLAYBACK_INVALID_MANIFEST",
      "Playback manifest is unavailable.",
      503,
    );
  }
  if (!text.startsWith("#EXTM3U") || text.includes("#EXT-X-KEY")) fail();
  const keys = new Set(allowed),
    base = current.includes("/")
      ? current.slice(0, current.lastIndexOf("/") + 1)
      : "";
  const replace = (uri: string) => {
    if (
      !/^[a-zA-Z0-9_/.-]+$/.test(uri) ||
      uri.startsWith("/") ||
      uri.split("/").some((p) => !p || p === ".." || p === ".")
    )
      fail();
    const key = base + uri;
    if (!keys.has(key)) fail();
    if (key.endsWith(".m3u8")) {
      const m = key.match(/^([0-2])\/index\.m3u8$/);
      if (!m) fail();
      return variantUrl(m[1]);
    }
    if (!/\.(mp4|m4s|vtt)$/.test(key)) fail();
    return sign(key);
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line || (line.startsWith("#") && !line.includes('URI="')))
        return line;
      if (line.startsWith("#"))
        return line.replace(
          /URI="([^"]+)"/g,
          (_, uri: string) => 'URI="' + replace(uri) + '"',
        );
      return replace(line);
    })
    .join("\n");
}
