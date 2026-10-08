import { expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import type { SQL } from "bun";
import { CatalogStore, type PlayableRow } from "./repository";
import { CatalogService } from "./service";
import { createCatalogModule } from "./index";
import { parseList } from "../../shared/content-pagination";
import { createApp } from "../../app";

function row(id: number, kind: "movie" | "standalone" | "episode" = "movie") {
  return {
    video: {
      id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
      slug: `video-${id}`,
      title: `Video ${id}`,
      synopsis: "Story",
      kind,
      createdAt: new Date("2026-10-08T00:00:00.000Z"),
      episodeNumber: null,
    },
    source: { facts: { durationMs: 1000 } },
    season: null,
    parent: null,
  } as unknown as PlayableRow;
}
function fixture(read: CatalogStore["playable"]) {
  return new CatalogService({ playable: read } as CatalogStore);
}
test("filtered list uses canonical kinds before limit, keeps cursor ties and shares equivalent cache keys", async () => {
  const calls: Parameters<CatalogStore["playable"]>[0][] = [];
  const service = fixture(async (query) => {
    calls.push(query);
    return query?.cursor ? [row(1)] : [row(3), row(2, "standalone"), row(1)];
  });
  const first = await service.list({ limit: "2", kinds: "standalone,movie" });
  expect(first.items.map((i) => i.id)).toEqual([
    row(3).video.id,
    row(2).video.id,
  ]);
  expect(first.nextCursor).not.toBeNull();
  expect(await service.list({ limit: "2", kinds: "movie,standalone" })).toEqual(
    first,
  );
  expect(calls).toEqual([
    { limit: 3, kinds: ["movie", "standalone"], cursor: undefined },
  ]);
  const next = await service.list({
    limit: "2",
    kinds: "movie,standalone",
    cursor: first.nextCursor!,
  });
  expect(next.items.map((i) => i.id)).toEqual([row(1).video.id]);
  expect(next.nextCursor).toBeNull();
  expect(calls[1]?.cursor).toEqual({
    at: row(2).video.createdAt,
    id: row(2).video.id,
  });
  for (const kinds of ["movie", "standalone", undefined] as const)
    await expect(
      service.list({ kinds, cursor: first.nextCursor! }),
    ).rejects.toMatchObject({ httpStatus: 422 });
  expect(calls.length).toBe(2);
});
test("omitted kinds retains legacy cursor fingerprint and all kinds; limits and filters isolate cache", async () => {
  let reads = 0;
  const service = fixture(async () => {
    reads++;
    return [row(3, "episode"), row(2)];
  });
  const first = await service.list({ limit: "1" });
  expect(first.items[0]?.kind).toBe("episode");
  const old = parseList(
    { limit: "1", cursor: first.nextCursor! },
    "public-videos",
  );
  expect(old.filter).toBe(
    '{"scope":"public-videos","search":null,"includeArchived":false}',
  );
  await service.list({ kinds: "movie", limit: "1" });
  await service.list({ kinds: "standalone", limit: "1" });
  await service.list({ limit: "2" });
  expect(reads).toBe(4);
});
test("HTTP rejects invalid kinds and cross-filter cursor before I/O; finite variants remain anonymous", async () => {
  let reads = 0;
  const service = fixture(async () => {
    reads++;
    return [row(2), row(1)];
  });
  const app = createCatalogModule(service);
  for (const kinds of [
    "episode",
    "series",
    "",
    "movie,movie",
    "movie,",
    "Movie",
    "movie,standalone,episode",
    "movie, standalone",
  ])
    expect(
      (
        await app.handle(
          new Request(`http://test/videos?kinds=${encodeURIComponent(kinds)}`),
        )
      ).status,
    ).toBe(422);
  expect(reads).toBe(0);
  const first = await service.list({ kinds: "movie", limit: "1" });
  expect(
    (
      await app.handle(
        new Request(
          `http://test/videos?kinds=standalone&cursor=${first.nextCursor}`,
        ),
      )
    ).status,
  ).toBe(422);
  expect(reads).toBe(1);
  for (const kinds of [
    "movie",
    "standalone",
    "movie,standalone",
    "standalone,movie",
  ])
    expect(
      (await app.handle(new Request(`http://test/videos?kinds=${kinds}`)))
        .status,
    ).toBe(200);
});
test("OpenAPI exposes optional finite kinds without cookie security", async () => {
  const response = await createApp().handle(
    new Request("http://test/openapi/json"),
  );
  const doc = await response.json();
  const route = doc.paths["/videos"].get;
  const kinds = route.parameters.find(
    (p: { name: string }) => p.name === "kinds",
  );
  expect(kinds.required).toBe(false);
  expect(kinds.schema.enum).toEqual([
    "movie",
    "standalone",
    "movie,standalone",
    "standalone,movie",
  ]);
  expect(route.security ?? []).toEqual([]);
});
test("repository binds kinds in the visibility WHERE before LIMIT and retains descending createdAt/id tuple", async () => {
  const queries: { sql: string; params: unknown[] }[] = [];
  const client = {
    unsafe: (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { values: async () => [] };
    },
  } as unknown as SQL;
  const store = new CatalogStore(drizzle({ client }));
  await store.playable({
    kinds: ["movie", "standalone"],
    limit: 21,
    cursor: { at: row(2).video.createdAt, id: row(2).video.id },
  });
  const filtered = queries[0]!;
  expect(filtered.sql).toMatch(/"videos"\."kind" in \(\$\d+, \$\d+\)/);
  expect(filtered.params).toContain("movie");
  expect(filtered.params).toContain("standalone");
  expect(filtered.sql).toMatch(
    /order by "videos"\."created_at" desc, "videos"\."id" desc limit \$\d+$/,
  );
  expect(filtered.params.at(-1)).toBe(21);
  expect(filtered.sql.indexOf('"videos"."kind" in')).toBeLessThan(
    filtered.sql.indexOf(" limit "),
  );
  await store.playable({ limit: 21 });
  expect(queries[1]!.sql).not.toContain('"videos"."kind" in');
});
