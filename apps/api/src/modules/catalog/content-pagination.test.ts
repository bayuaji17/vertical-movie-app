import { describe, expect, test } from "bun:test";
import { parseEpisodes, episodeCursor } from "./content-pagination";
import { ContentError } from "../../shared/content-error";
const now = new Date("2026-10-07T00:00:00.123Z"),
  id = "00000000-0000-4000-8000-000000000001";
describe("Series episode cursor", () => {
  test("defaults20, supports100, and preserves hierarchy/asOf across pages", () => {
    const q = parseEpisodes("a-series", {}, now);
    expect(q.limit).toBe(20);
    expect(q.asOf).toBe("2026-10-07T00:00:00.123000Z");
    expect(parseEpisodes("a-series", { limit: "100" }, now).limit).toBe(100);
    const next = parseEpisodes(
      "a-series",
      { cursor: episodeCursor(q, id, { season: 2, episode: 19, id }) },
      new Date(now.getTime() + 10),
    );
    expect(next.seriesId).toBe(id);
    expect(next.asOf).toBe(q.asOf);
    expect(next.after).toEqual({ season: 2, episode: 19, id });
  });
  test("rejects wrong slug/limit, malformed cursor and every foreign scope before I/O", () => {
    const q = parseEpisodes("a-series", {}, now),
      cursor = episodeCursor(q, id, { season: 1, episode: 2, id });
    for (const slug of ["bad/slug", "Upper", "a".repeat(181)])
      expect(() => parseEpisodes(slug, {}, now)).toThrow(ContentError);
    for (const limit of ["0", "101", "1.5", "01", " 2", "NaN"])
      expect(() => parseEpisodes("a-series", { limit }, now)).toThrow(
        ContentError,
      );
    expect(() => parseEpisodes("other", { cursor }, now)).toThrow(ContentError);
    expect(() =>
      parseEpisodes("a-series", { cursor, limit: "21" }, now),
    ).toThrow(ContentError);
    for (const value of [
      "",
      "!",
      "a".repeat(2049),
      Buffer.from("[]").toString("base64url"),
    ])
      expect(() => parseEpisodes("a-series", { cursor: value }, now)).toThrow(
        ContentError,
      );
  });
  test("rejects nonpositive/overflow positions, extra fields, future/invalid timestamps and UUIDs", () => {
    const q = parseEpisodes("a-series", {}, now),
      initial = JSON.parse(
        Buffer.from(
          episodeCursor(q, id, { season: 1, episode: 2, id }),
          "base64url",
        ).toString(),
      );
    for (const mutate of [
      (v: any) => (v.version = 2),
      (v: any) => (v.extra = true),
      (v: any) => (v.after.extra = true),
      (v: any) => (v.after.season = 0),
      (v: any) => (v.after.episode = -1),
      (v: any) => (v.after.season = 2147483648),
      (v: any) => (v.after.id = "invalid"),
      (v: any) => (v.seriesId = "invalid"),
      (v: any) => (v.asOf = "2026-02-31T00:00:00.000000Z"),
      (v: any) => (v.asOf = "2027-01-01T00:00:00.000000Z"),
    ]) {
      const v = structuredClone(initial);
      mutate(v);
      expect(() =>
        parseEpisodes(
          "a-series",
          { cursor: Buffer.from(JSON.stringify(v)).toString("base64url") },
          now,
        ),
      ).toThrow(ContentError);
    }
  });
});
