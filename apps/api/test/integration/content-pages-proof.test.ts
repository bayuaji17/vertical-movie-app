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
  await database.db.insert(videos).values(
    entries.map((v) => ({
      ...v,
      kind: "movie" as const,
      publicationStatus: v.archivedAt
        ? ("archived" as const)
        : ("draft" as const),
    })),
  );
  await database.db.insert(videos).values(
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
test("status filters, sorting and slug search return the right rows in a stable order", async () => {
  const at = (hour: number) => new Date(`2026-10-06T0${hour}:00:00Z`);
  const row = (
    title: string,
    slug: string,
    status: "draft" | "published" | "archived",
    updated: number,
    created: number,
  ) => ({
    id: crypto.randomUUID(),
    kind: "movie" as const,
    title,
    slug,
    publicationStatus: status,
    archivedAt: status === "archived" ? at(1) : null,
    ...(status === "published"
      ? { publishedAt: at(1), firstPublishedAt: at(1) }
      : {}),
    createdBy: "content-admin",
    updatedBy: "content-admin",
    updatedAt: at(updated),
    createdAt: at(created),
  });
  await database.db
    .insert(videos)
    .values([
      row("Zeta Beta", "z-beta", "published", 3, 4),
      row("zeta alpha", "z-alpha", "draft", 2, 3),
      row("Zeta Gamma", "z-gamma", "archived", 1, 2),
      row("Zeta Delta", "special-slug-term", "draft", 4, 1),
    ]);
  const titles = async (
    input: Omit<Parameters<typeof service.list>[0], "type" | "search"> & {
      search?: string;
    },
  ) =>
    (await service.list({ type: "film", search: "zeta", ...input })).items.map(
      (item) => item.title,
    );

  // Default: active (no archived), by last update, newest first.
  expect(await titles({})).toEqual(["Zeta Delta", "Zeta Beta", "zeta alpha"]);
  expect(await titles({ status: "all" })).toEqual([
    "Zeta Delta",
    "Zeta Beta",
    "zeta alpha",
    "Zeta Gamma",
  ]);
  expect(await titles({ status: "archived" })).toEqual(["Zeta Gamma"]);
  expect(await titles({ status: "draft" })).toEqual([
    "Zeta Delta",
    "zeta alpha",
  ]);
  expect(await titles({ status: "published" })).toEqual(["Zeta Beta"]);
  // The legacy flag keeps working.
  expect(await titles({ includeArchived: "true" })).toHaveLength(4);
  expect(await titles({ includeArchived: "false" })).toHaveLength(3);

  expect(await titles({ sort: "updated", order: "asc" })).toEqual([
    "zeta alpha",
    "Zeta Beta",
    "Zeta Delta",
  ]);
  expect(await titles({ sort: "created", status: "all" })).toEqual([
    "Zeta Beta",
    "zeta alpha",
    "Zeta Gamma",
    "Zeta Delta",
  ]);
  // Case-insensitive title order, A to Z by default for text columns.
  expect(await titles({ sort: "title" })).toEqual([
    "zeta alpha",
    "Zeta Beta",
    "Zeta Delta",
  ]);
  expect(await titles({ sort: "title", order: "desc" })).toEqual([
    "Zeta Delta",
    "Zeta Beta",
    "zeta alpha",
  ]);
  // Shown status (archived wins over the stored one), id breaks ties.
  const byStatus = await service.list({
    type: "film",
    search: "zeta",
    status: "all",
    sort: "status",
  });
  expect(byStatus.items.map((i) => i.publicationStatus)).toEqual([
    "archived",
    "draft",
    "draft",
    "published",
  ]);
  expect(byStatus.items[1]!.id < byStatus.items[2]!.id).toBe(true);

  // Search matches slugs as well as titles, with literal wildcards.
  expect(await titles({ search: "special-slug" })).toEqual(["Zeta Delta"]);
  expect(await titles({ search: "z_alpha" })).toEqual([]);
  expect(await titles({ search: "z-alpha" })).toEqual(["zeta alpha"]);

  // Series: "unpublished" is active but is not a draft.
  await database.db.insert(series).values({
    id: crypto.randomUUID(),
    title: "Zeta Series",
    slug: "zeta-series",
    publicationStatus: "unpublished",
    createdBy: "content-admin",
    updatedBy: "content-admin",
  });
  const names = async (status: "active" | "draft" | "all") =>
    (await service.list({ type: "series", search: "zeta", status })).items.map(
      (i) => i.title,
    );
  expect(await names("active")).toEqual(["Zeta Series"]);
  expect(await names("all")).toEqual(["Zeta Series"]);
  expect(await names("draft")).toEqual([]);
});
test("the updated-order and kind-updated indexes are used for the default list", async () => {
  await database.client.unsafe("SET enable_seqscan = off");
  const plan = async (sqlText: string) =>
    (await database.client.unsafe(`EXPLAIN ${sqlText}`))
      .map((r: Record<string, string>) => Object.values(r)[0])
      .join("\n");
  expect(
    await plan(
      `SELECT id FROM videos WHERE archived_at IS NULL AND kind='movie' ORDER BY updated_at DESC, id DESC LIMIT 10`,
    ),
  ).toContain("videos_kind_updated_idx");
  expect(
    await plan(
      `SELECT id FROM series WHERE archived_at IS NULL ORDER BY updated_at DESC, id DESC LIMIT 10`,
    ),
  ).toContain("series_admin_updated_idx");
  await database.client.unsafe("RESET enable_seqscan");
});
