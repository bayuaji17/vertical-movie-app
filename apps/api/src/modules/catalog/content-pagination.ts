import { invalid } from "../../shared/content-error";
import { instantMicros, sqlInstant } from "./home-pagination";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export type EpisodePosition = { season: number; episode: number; id: string };
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function only(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    invalid("Invalid episode cursor.");
}
function positive(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2147483647
  );
}
export function parseEpisodes(
  slug: string,
  input: { limit?: string; cursor?: string },
  now = new Date(),
) {
  if (!slugPattern.test(slug) || slug.length > 180)
    invalid("Invalid Series slug.");
  const limit = input.limit === undefined ? 20 : Number(input.limit);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    (input.limit !== undefined && !/^[1-9][0-9]{0,2}$/.test(input.limit))
  )
    invalid("Limit must be between 1 and 100.");
  const filter = JSON.stringify({
    scope: "series-episodes",
    slug,
    limit,
    sort: "season-asc_episode-asc_id-asc",
  });
  let asOf = sqlInstant(now),
    after: EpisodePosition | undefined,
    seriesId: string | undefined;
  if (input.cursor !== undefined) {
    if (
      !input.cursor.length ||
      input.cursor.length > 2048 ||
      !/^[A-Za-z0-9_-]+$/.test(input.cursor)
    )
      invalid("Invalid episode cursor.");
    let cursor: unknown;
    try {
      const bytes = Buffer.from(input.cursor, "base64url");
      if (bytes.toString("base64url") !== input.cursor)
        invalid("Invalid episode cursor.");
      cursor = JSON.parse(bytes.toString("utf8"));
    } catch {
      invalid("Invalid episode cursor.");
    }
    if (!object(cursor)) invalid("Invalid episode cursor.");
    only(cursor, ["version", "filter", "seriesId", "asOf", "after"]);
    if (
      cursor.version !== 1 ||
      cursor.filter !== filter ||
      typeof cursor.seriesId !== "string" ||
      !uuid.test(cursor.seriesId) ||
      typeof cursor.asOf !== "string" ||
      !object(cursor.after)
    )
      invalid("Cursor does not match this Series query.");
    only(cursor.after, ["season", "episode", "id"]);
    if (
      !positive(cursor.after.season) ||
      !positive(cursor.after.episode) ||
      typeof cursor.after.id !== "string" ||
      !uuid.test(cursor.after.id) ||
      instantMicros(cursor.asOf) > BigInt(now.getTime() + 1000) * 1000n
    )
      invalid("Invalid episode cursor boundary.");
    asOf = cursor.asOf;
    seriesId = cursor.seriesId;
    after = {
      season: cursor.after.season,
      episode: cursor.after.episode,
      id: cursor.after.id,
    };
  }
  return { slug, limit, filter, asOf, seriesId, after };
}
export type EpisodesQuery = ReturnType<typeof parseEpisodes>;
export function episodeCursor(
  query: EpisodesQuery,
  seriesId: string,
  after: EpisodePosition,
) {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      filter: query.filter,
      seriesId,
      asOf: query.asOf,
      after,
    }),
  ).toString("base64url");
}
