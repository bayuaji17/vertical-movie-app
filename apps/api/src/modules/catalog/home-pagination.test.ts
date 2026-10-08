import { describe, expect, test } from "bun:test";
import {
  homeCursor,
  instantMicros,
  parseHome,
  sqlInstant,
} from "./home-pagination";
const now = new Date("2026-10-07T04:00:00.123Z"),
  id = "00000000-0000-4000-8000-000000000001";
const pos = { at: "2026-10-07T03:59:59.123456Z", id, kind: "movie" as const };
describe("public home cursor", () => {
  test("preserves microsecond position, stable boundary and canonical filters", () => {
    const q = parseHome({ search: "  RAIN ", genreId: id }, now);
    const c = homeCursor(q, pos);
    const page = parseHome(
      { search: "rain", genreId: id, cursor: c },
      new Date(now.getTime() + 500),
    );
    expect(page.after).toEqual(pos);
    expect(page.asOf).toBe(sqlInstant(now));
    expect(
      instantMicros(pos.at) - instantMicros("2026-10-07T03:59:59.123455Z"),
    ).toBe(1n);
  });
  test("rejects query/scope/limit changes and malformed positions", () => {
    const q = parseHome({}, now),
      cursor = homeCursor(q, pos);
    for (const input of [
      { cursor, search: "other" },
      { cursor, kind: "series" as const },
      { cursor, genreId: id },
      { cursor, limit: "7" },
      { cursor: "" },
      { cursor: "++" },
      { limit: "101" },
      { limit: "0" },
      { genreId: "rain" },
    ])
      expect(() => parseHome(input, now)).toThrow();
    expect(() => parseHome({ cursor }, now, "catalog-genres")).toThrow();
    const corrupt = JSON.parse(Buffer.from(cursor, "base64url").toString());
    for (const after of [
      { ...pos, at: "2026-02-31T03:59:59.123456Z" },
      { ...pos, at: "2026-10-07T05:00:00.123456Z" },
      { ...pos, kind: "episode" },
      { ...pos, secret: "key" },
    ])
      expect(() =>
        parseHome(
          {
            cursor: Buffer.from(JSON.stringify({ ...corrupt, after })).toString(
              "base64url",
            ),
          },
          now,
        ),
      ).toThrow();
  });
  test("bounds Unicode search and uses a separate genre cursor", () => {
    expect(parseHome({ search: "🎬".repeat(200) }, now).search.length).toBe(
      400,
    );
    expect(() => parseHome({ search: "🎬".repeat(201) }, now)).toThrow();
    const q = parseHome({}, now, "catalog-genres");
    expect(q.limit).toBe(100);
    expect(
      parseHome(
        { cursor: homeCursor(q, { at: pos.at, id }) },
        now,
        "catalog-genres",
      ).after,
    ).toEqual({ at: pos.at, id });
  });
});
