import { invalid } from "./content-error";
export type ListInput = {
  limit?: string;
  cursor?: string;
  search?: string;
  includeArchived?: string;
};
export type Cursor = {
  createdAt: string;
  id: string;
  filter: string;
  version: 1;
};
export function parseList(
  input: ListInput,
  scope: string,
  filters: Record<string, string | undefined> = {},
) {
  const limit = input.limit === undefined ? 20 : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    invalid("Limit must be between 1 and 100.");
  if (
    input.includeArchived !== undefined &&
    !["true", "false"].includes(input.includeArchived)
  )
    invalid("Invalid archive filter.");
  const search = input.search?.trim() || undefined;
  const includeArchived = input.includeArchived === "true";
  const filter = JSON.stringify({
    scope,
    search: search ?? null,
    includeArchived,
    ...filters,
  });
  let cursor: Cursor | undefined;
  if (input.cursor) {
    if (input.cursor.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(input.cursor))
      invalid("Invalid cursor.");
    let value: unknown;
    try {
      value = JSON.parse(Buffer.from(input.cursor, "base64url").toString());
    } catch {
      invalid("Invalid cursor.");
    }
    if (
      !value ||
      typeof value !== "object" ||
      !("version" in value) ||
      value.version !== 1 ||
      !("filter" in value) ||
      value.filter !== filter ||
      !("id" in value) ||
      typeof value.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value.id,
      ) ||
      !("createdAt" in value) ||
      typeof value.createdAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.createdAt) ||
      !Number.isFinite(Date.parse(value.createdAt))
    )
      invalid("Cursor does not match this query.");
    cursor = { version: 1, filter, id: value.id, createdAt: value.createdAt };
  }
  return { limit, cursor, search, includeArchived, filter };
}
export type ParsedList = ReturnType<typeof parseList>;
export function page<T extends { id: string; createdAt: Date }>(
  rows: T[],
  query: ParsedList,
) {
  const items = rows.slice(0, query.limit),
    last = items.at(-1);
  const nextCursor =
    rows.length > query.limit && last
      ? Buffer.from(
          JSON.stringify({
            version: 1,
            filter: query.filter,
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          }),
        ).toString("base64url")
      : null;
  return { items, nextCursor };
}
