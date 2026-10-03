import { test, expect } from "bun:test";
import { Elysia } from "elysia";
import { CreateVideoBody } from "../modules/videos/model";
import { createContentErrors } from "../plugins/errors";
import { parseList, page } from "./content-pagination";
import { validateRelease, language, cleanText } from "./content-metadata";
import { mapContentError } from "./content-error";
test("strict movie/episode HTTP union rejects unknown and privileged fields", async () => {
  const app = new Elysia({ normalize: false })
    .use(createContentErrors())
    .post("/video", ({ body }) => body, { body: CreateVideoBody });
  const send = (body: object) =>
    app.handle(
      new Request("http://localhost/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  expect((await send({ title: "Movie", kind: "movie" })).status).toBe(200);
  for (const extra of [
    { seasonId: Bun.randomUUIDv7() },
    { publicationStatus: "published" },
    { createdBy: "attacker" },
    { durationMs: 123 },
    { title: "Movie", kind: "episode" },
  ])
    expect(
      (await send({ title: "Movie", kind: "movie", ...extra })).status,
    ).toBe(422);
});
test("cursor validates limit, encoding, query binding and tied timestamps", () => {
  const q = parseList({ limit: "1" }, "videos");
  const result = page(
    [
      { id: Bun.randomUUIDv7(), createdAt: new Date("2026-10-03T00:00:00Z") },
      { id: Bun.randomUUIDv7(), createdAt: new Date() },
    ],
    q,
  );
  expect(
    parseList({ limit: "1", cursor: result.nextCursor ?? undefined }, "videos")
      .cursor,
  ).toBeDefined();
  for (const input of [
    { limit: "0" },
    { limit: "101" },
    { cursor: "%%%" },
    { cursor: result.nextCursor ?? undefined, search: "different" },
  ])
    expect(() => parseList(input, "videos")).toThrow();
});
test("metadata validates calendar, language and empty title; SQL error is redacted", () => {
  expect(() => validateRelease(2020, "2021-01-01")).toThrow();
  expect(() => validateRelease(null, "2026-02-30")).toThrow();
  expect(() => cleanText("  ", true)).toThrow();
  expect(language("id")).toBe("id");
  expect(() => language("not_a_tag")).toThrow();
  expect(
    mapContentError({
      cause: { code: "23505", constraint: "videos_episode_number_unique" },
    })?.code,
  ).toBe("EPISODE_NUMBER_CONFLICT");
});
