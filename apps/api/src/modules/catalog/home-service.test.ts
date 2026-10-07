import { expect, test } from "bun:test";
import { CatalogService } from "./service";
import type { HomeStore } from "./home-repository";
import { createCatalogModule } from "./index";
const empty = { items: [], total: 0, nextCursor: null };
function store(page: HomeStore["page"]): HomeStore {
  return {
    page,
    genres: async () => ({ items: [], nextCursor: null }),
    poster: async () => undefined,
  };
}
test("canonical public cache returns remaining freshness and expires without stacking TTL", async () => {
  let now = Date.parse("2026-10-07T00:00:00Z"),
    reads = 0;
  const service = new CatalogService(
    undefined,
    () => now,
    store(async () => {
      reads++;
      return empty;
    }),
  );
  expect((await service.home({ search: " Rain " })).freshForMs).toBe(60000);
  now += 59999;
  expect((await service.home({ search: "rain" })).freshForMs).toBe(1);
  expect(reads).toBe(1);
  now++;
  await service.home({ search: "rain" });
  expect(reads).toBe(2);
  expect((await service.featured()).item).toBeNull();
  expect((await service.genres({})).items).toEqual([]);
});
test("invalidation fences a slow fill and bounds metadata cache", async () => {
  let release!: () => void,
    reads = 0;
  const pending = new Promise<void>((r) => (release = r));
  const service = new CatalogService(
    undefined,
    undefined,
    store(async () => {
      if (++reads === 1) await pending;
      return empty;
    }),
  );
  const first = service.home({});
  service.invalidate();
  release();
  expect((await first).freshForMs).toBe(0);
  await service.home({});
  expect(reads).toBe(2);
  for (let i = 0; i < 101; i++) await service.home({ search: String(i) });
  await service.home({});
  expect(reads).toBe(104);
});
test("public routes validate before dependency access and keep failure distinct from valid empty", async () => {
  let reads = 0;
  const app = createCatalogModule(
    new CatalogService(
      undefined,
      undefined,
      store(async () => {
        reads++;
        return empty;
      }),
    ),
  );
  for (const suffix of [
    "?limit=101",
    "?kind=episode",
    "?genreId=invalid",
    "?cursor=malformed",
    "?search=" + encodeURIComponent("🎬".repeat(201)),
  ]) {
    const r = await app.handle(
      new Request("http://localhost/catalog" + suffix),
    );
    expect(r.status).toBe(422);
  }
  expect(reads).toBe(0);
  for (const path of ["/catalog", "/catalog/genres", "/catalog/featured"]) {
    const r = await app.handle(new Request("http://localhost" + path));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, max-age=60");
  }
  expect(
    (
      await createCatalogModule().handle(
        new Request("http://localhost/catalog"),
      )
    ).status,
  ).toBe(503);
});
