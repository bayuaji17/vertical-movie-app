import { expect, test } from "bun:test";
import { createCatalogModule } from "./index";
import { CatalogService } from "./service";
import type { PublicContentReader } from "./content-repository";
import type { PublicHomeItem } from "./home-model";
const id = "00000000-0000-4000-8000-000000000001";
const item: PublicHomeItem = {
  id,
  kind: "movie",
  slug: "a-film",
  title: "Film",
  synopsis: "Story",
  publishedAt: "2026-10-07T00:00:00.000000Z",
  genres: [],
  posterPath: `/catalog/movie/${id}/poster`,
  durationMs: 1000,
};
const empty = { items: [], total: 0, nextCursor: null };
test("watch metadata is unsigned, uses remaining freshness and invalidates after publication", async () => {
  let clock = 0,
    reads = 0;
  const video = {
    id,
    kind: "movie" as const,
    slug: item.slug,
    title: item.title,
    synopsis: item.synopsis,
    durationMs: 1000,
    seasonNumber: null,
    episodeNumber: null,
    seriesSlug: null,
  };
  const reader: PublicContentReader = {
    watch: async (slug) => {
      reads++;
      return slug === item.slug ? video : undefined;
    },
    detail: async () => item,
    episodes: async () => empty,
  };
  const service = new CatalogService(undefined, () => clock, undefined, reader);
  const app = createCatalogModule(service);
  const first = await app.handle(
    new Request("http://test/catalog/watch/a-film"),
  );
  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ item: video, freshForMs: 60000 });
  clock = 59000;
  expect((await service.watchMetadata("a-film")).freshForMs).toBe(1000);
  expect(reads).toBe(1);
  service.invalidate();
  await service.watchMetadata("a-film");
  expect(reads).toBe(2);
  expect(
    (await app.handle(new Request("http://test/catalog/watch/missing"))).status,
  ).toBe(404);
});
test("public detail has unsigned DTO, wrong kind/slug404 and unavailable503", async () => {
  const reader: PublicContentReader = {
    watch: async () => undefined,
    detail: async (kind, slug) =>
      kind === item.kind && slug === item.slug ? item : undefined,
    episodes: async () => empty,
  };
  const app = createCatalogModule(
    new CatalogService(undefined, undefined, undefined, reader),
  );
  const good = await app.handle(
    new Request("http://test/catalog/details/movie/a-film"),
  );
  expect(good.status).toBe(200);
  const data = await good.json();
  expect(data.item).toEqual(item);
  expect(data.freshForMs).toBeGreaterThan(0);
  expect(JSON.stringify(data)).not.toMatch(
    /outputPrefix|readyJobId|masterUrl|secret/,
  );
  for (const path of ["standalone/a-film", "series/missing"])
    expect(
      (await app.handle(new Request("http://test/catalog/details/" + path)))
        .status,
    ).toBe(404);
  expect(
    (
      await createCatalogModule().handle(
        new Request("http://test/catalog/details/movie/a-film"),
      )
    ).status,
  ).toBe(503);
});
test("strict detail/episode query validation happens before store I/O", async () => {
  let reads = 0;
  const reader: PublicContentReader = {
    watch: async () => undefined,
    detail: async () => {
      reads++;
      return item;
    },
    episodes: async () => {
      reads++;
      return empty;
    },
  };
  const app = createCatalogModule(
    new CatalogService(undefined, undefined, undefined, reader),
  );
  for (const path of [
    "/catalog/details/episode/a-film",
    "/catalog/details/movie/Bad",
    "/catalog/series/a-film/episodes?limit=101",
    "/catalog/series/a-film/episodes?cursor=bad",
    "/catalog/series/a-film/episodes?search=x",
  ])
    expect((await app.handle(new Request("http://test" + path))).status).toBe(
      422,
    );
  expect(reads).toBe(0);
  expect(
    (
      await app.handle(
        new Request("http://test/catalog/series/a-film/episodes"),
      )
    ).status,
  ).toBe(200);
  expect(reads).toBe(1);
});
test("remaining freshness and successful invalidation apply to details and episodes", async () => {
  let clock = 0,
    reads = 0;
  const reader: PublicContentReader = {
    watch: async () => undefined,
    detail: async () => {
      reads++;
      return item;
    },
    episodes: async () => {
      reads++;
      return empty;
    },
  };
  const service = new CatalogService(undefined, () => clock, undefined, reader);
  expect((await service.detail("movie", "a-film")).freshForMs).toBe(60000);
  clock = 59000;
  expect((await service.detail("movie", "a-film")).freshForMs).toBe(1000);
  await service.episodes("a-film", {});
  expect(reads).toBe(2);
  service.invalidate();
  await service.detail("movie", "a-film");
  await service.episodes("a-film", {});
  expect(reads).toBe(4);
});
test("a late detail read cannot refill metadata cache after invalidation", async () => {
  let complete!: (v: PublicHomeItem) => void,
    reads = 0;
  const reader: PublicContentReader = {
    watch: async () => undefined,
    detail: async () => {
      reads++;
      return reads === 1
        ? await new Promise<PublicHomeItem>((r) => {
            complete = r;
          })
        : { ...item, title: "Updated" };
    },
    episodes: async () => empty,
  };
  const service = new CatalogService(undefined, () => 0, undefined, reader),
    old = service.detail("movie", "a-film");
  service.invalidate();
  expect((await service.detail("movie", "a-film")).item.title).toBe("Updated");
  complete(item);
  expect((await old).freshForMs).toBe(0);
  expect((await service.detail("movie", "a-film")).item.title).toBe("Updated");
  expect(reads).toBe(2);
});
