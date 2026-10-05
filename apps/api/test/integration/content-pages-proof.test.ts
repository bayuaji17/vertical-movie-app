import { afterAll, beforeAll, expect, test } from "bun:test";
import { resetContentDatabase } from "./content-fixture";
import { videos, series } from "../../src/db/schema";
import { createContentPageRepository } from "../../src/modules/content/repository";
import { ContentPageService } from "../../src/modules/content/service";
let database: Awaited<ReturnType<typeof resetContentDatabase>>;
let service: ContentPageService;
beforeAll(async () => {
  database = await resetContentDatabase();
  service = new ContentPageService(createContentPageRepository(database.db));
  const entries = Array.from({ length: 43 }, (_, i) => ({
    id: crypto.randomUUID(),
    title:
      i === 0 ? "Literal %_\\ Match" : `Content ${String(i).padStart(2, "0")}`,
    slug: `content-${i}`,
    createdBy: "content-admin",
    updatedBy: "content-admin",
    createdAt: new Date("2026-10-05T00:00:00Z"),
    archivedAt: i === 42 ? new Date() : null,
  }));
  await database.db
    .insert(videos)
    .values(
      entries.map((v) => ({
        ...v,
        kind: "movie" as const,
        publicationStatus: v.archivedAt
          ? ("archived" as const)
          : ("draft" as const),
      })),
    );
  await database.db
    .insert(videos)
    .values(
      entries.map((v) => ({
        ...v,
        id: crypto.randomUUID(),
        slug: `standalone-${v.slug}`,
        kind: "standalone" as const,
        publicationStatus: v.archivedAt
          ? ("archived" as const)
          : ("draft" as const),
      })),
    );
  await database.db.insert(series).values(entries);
}, 20000);
afterAll(async () => database?.client.close());
test("three resource types have precise totals/last-page/empty boundaries and stable ordering", async () => {
  for (const type of ["film", "standalone", "series"] as const) {
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map((page) => service.list({ type, page: String(page) })),
    );
    expect(pages.map((p) => p.items.length)).toEqual([10, 10, 10, 10, 2]);
    expect(
      pages.every(
        (p) =>
          p.total === 42 &&
          p.totalPages === 5 &&
          p.items.every((x) => x.type === type),
      ),
    ).toBe(true);
    const ids = pages.flatMap((p) => p.items.map((x) => x.id));
    expect(new Set(ids).size).toBe(42);
    expect(ids).toEqual([...ids].sort().reverse());
    expect((await service.list({ type, page: "6" })).items).toHaveLength(0);
    const custom = await service.list({ type, pageSize: "3", page: "14" });
    expect(custom.totalPages).toBe(14);
    expect(custom.items).toHaveLength(3);
    expect((await service.list({ type, includeArchived: "true" })).total).toBe(
      43,
    );
    const empty = await service.list({ type, search: "no such title" });
    expect(empty.total).toBe(0);
    expect(empty.totalPages).toBe(0);
    expect(empty.items).toHaveLength(0);
    const literal = await service.list({ type, search: "%_\\" });
    expect(literal.total).toBe(1);
    expect(literal.items[0]?.title).toBe("Literal %_\\ Match");
  }
});
test("count and rows stay consistent while another connection changes the catalog", async () => {
  const reads = Array.from({ length: 12 }, async () => {
    const page = await service.list({ type: "film", pageSize: "100" });
    expect(page.items.length).toBe(page.total);
  });
  const write = database.db.insert(videos).values(
    Array.from({ length: 12 }, (_, i) => ({
      id: crypto.randomUUID(),
      title: `Concurrent ${i}`,
      slug: `concurrent-${i}`,
      kind: "movie" as const,
      createdBy: "content-admin",
      updatedBy: "content-admin",
    })),
  );
  await Promise.all([...reads, write]);
  expect((await service.list({ type: "film", pageSize: "100" })).total).toBe(
    54,
  );
});
