import { expect, test } from "bun:test";
import { Elysia } from "elysia";
import { HomeFeaturedDto, HomeItem, type PublicHomeItem } from "./home-model";
const common = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "rain",
  title: "Rain",
  synopsis: "A story",
  publishedAt: "2026-10-07T03:00:00.123456Z",
  genres: [],
  posterPath: "/catalog/movie/00000000-0000-4000-8000-000000000001/poster",
};
async function validate(item: unknown) {
  return new Elysia({ normalize: false })
    .get("/", () => item as PublicHomeItem, { response: HomeItem })
    .handle(new Request("http://fixture/"));
}
test("public item contract permits empty genres and all three kinds", async () => {
  for (const item of [
    { ...common, kind: "movie", durationMs: 60000 },
    { ...common, kind: "standalone", durationMs: 60000 },
    { ...common, kind: "series", episodeCount: 1 },
  ])
    expect((await validate(item)).status).toBe(200);
  const r = await new Elysia({ normalize: false })
    .get("/", () => ({ item: null, freshForMs: 0 }), {
      response: HomeFeaturedDto,
    })
    .handle(new Request("http://fixture/"));
  expect(r.status).toBe(200);
});
test("public contract rejects episode/private fields and invalid duration", async () => {
  for (const item of [
    { ...common, kind: "episode", durationMs: 1 },
    { ...common, kind: "movie", durationMs: 0 },
    { ...common, kind: "movie", durationMs: 1800001 },
    { ...common, kind: "movie", durationMs: 1, objectKey: "secret" },
  ])
    expect((await validate(item)).status).not.toBe(200);
});
