import { invalid } from "../../shared/content-error";

export type HomeKind = "movie" | "standalone" | "series";
export type HomeInput = {
  limit?: string;
  cursor?: string;
  search?: string;
  kind?: HomeKind;
  genreId?: string;
};
export const homeSort = "publishedAt-desc_id-asc_kind-asc";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const kinds = new Set(["movie", "standalone", "series"]);
const instant = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/;
type Position = { at: string; id: string; kind?: HomeKind };
type HomeCursor = {
  version: 1;
  scope: string;
  filter: string;
  asOf: string;
  after: Position;
};

export function sqlInstant(date: Date) {
  return date.toISOString().replace(/(\.\d{3})Z$/, "$1000Z");
}
export function instantMicros(value: string): bigint {
  if (
    !instant.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 23) !== value.slice(0, 23)
  )
    invalid("Invalid catalog timestamp.");
  return BigInt(Date.parse(value)) * 1000n + BigInt(value.slice(23, 26));
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function only(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    invalid("Invalid catalog cursor.");
}

export function parseHome(
  input: HomeInput,
  now = new Date(),
  scope: "catalog-home" | "catalog-genres" = "catalog-home",
) {
  const limit =
    input.limit === undefined
      ? scope === "catalog-home"
        ? 6
        : 100
      : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    invalid("Limit must be between 1 and 100.");
  if (input.search !== undefined && [...input.search].length > 200)
    invalid("Search must not exceed 200 characters.");
  const search = input.search?.trim().toLowerCase() ?? "";
  if (input.kind !== undefined && !kinds.has(input.kind))
    invalid("Invalid catalog kind.");
  const genreId = input.genreId?.toLowerCase();
  if (genreId !== undefined && !uuid.test(genreId))
    invalid("Invalid genre ID.");
  const filter = JSON.stringify({
    scope,
    search,
    kind: input.kind ?? null,
    genreId: genreId ?? null,
    limit,
    sort: scope === "catalog-home" ? homeSort : "createdAt-desc_id-asc",
  });
  let asOf = sqlInstant(now),
    after: Position | undefined;
  if (input.cursor !== undefined) {
    if (
      !input.cursor.length ||
      input.cursor.length > 2048 ||
      !/^[A-Za-z0-9_-]+$/.test(input.cursor)
    )
      invalid("Invalid catalog cursor.");
    let cursor: unknown;
    try {
      const bytes = Buffer.from(input.cursor, "base64url");
      if (bytes.toString("base64url") !== input.cursor)
        invalid("Invalid catalog cursor.");
      cursor = JSON.parse(bytes.toString("utf8"));
    } catch {
      invalid("Invalid catalog cursor.");
    }
    if (!object(cursor)) invalid("Invalid catalog cursor.");
    only(cursor, ["version", "scope", "filter", "asOf", "after"]);
    if (
      cursor.version !== 1 ||
      cursor.scope !== scope ||
      cursor.filter !== filter ||
      typeof cursor.asOf !== "string" ||
      !object(cursor.after)
    )
      invalid("Cursor does not match this catalog query.");
    only(
      cursor.after,
      scope === "catalog-home" ? ["at", "id", "kind"] : ["at", "id"],
    );
    if (
      typeof cursor.after.at !== "string" ||
      typeof cursor.after.id !== "string" ||
      !uuid.test(cursor.after.id) ||
      (scope === "catalog-home" &&
        (typeof cursor.after.kind !== "string" ||
          !kinds.has(cursor.after.kind)))
    )
      invalid("Invalid catalog cursor position.");
    if (
      instantMicros(cursor.asOf) > BigInt(now.getTime() + 1000) * 1000n ||
      instantMicros(cursor.after.at) > instantMicros(cursor.asOf)
    )
      invalid("Invalid catalog cursor boundary.");
    asOf = cursor.asOf;
    after = {
      at: cursor.after.at,
      id: cursor.after.id,
      ...(scope === "catalog-home"
        ? { kind: cursor.after.kind as HomeKind }
        : {}),
    };
  }
  return {
    limit,
    search,
    kind: input.kind,
    genreId,
    filter,
    scope,
    asOf,
    after,
  };
}
export type HomeQuery = ReturnType<typeof parseHome>;
export function homeCursor(query: HomeQuery, after: Position) {
  const cursor: HomeCursor = {
    version: 1,
    scope: query.scope,
    filter: query.filter,
    asOf: query.asOf,
    after,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}
