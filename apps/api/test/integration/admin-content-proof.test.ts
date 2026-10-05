import { beforeAll, afterAll, expect, test } from "bun:test";
import { createAdminContentFixture } from "./admin-content-fixture";
let fixture: Awaited<ReturnType<typeof createAdminContentFixture>>;
beforeAll(async () => {
  fixture = await createAdminContentFixture(async ({ headers }) =>
    headers.get("cookie")?.includes("fixture=admin")
      ? {
          user: {
            id: "browser-admin",
            name: "Browser Admin",
            email: "browser@example.test",
            role: "admin",
            banned: false,
          },
          session: { expiresAt: new Date(Date.now() + 600000) },
        }
      : null,
  );
}, 30000);
afterAll(async () => fixture?.close());
function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "fixture=admin",
) {
  return fixture.handle(
    new Request("http://content.test" + path, {
      method,
      headers: { cookie, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
test("metadata create/changed-field PATCH persist via Elysia and PostgreSQL for all three resources", async () => {
  for (const type of ["film", "standalone", "series"] as const) {
    const values = {
      title: `UI proof ${type}`,
      originalTitle: "Original",
      synopsis: "Summary",
      originalLanguage: "EN",
      releaseYear: 2024,
      releaseDate: "2024-02-29",
      rightsConfirmed: true,
      completionStatus: "completed" as const,
    };
    const input =
        type === "series"
          ? {
              title: values.title,
              originalTitle: values.originalTitle,
              synopsis: values.synopsis,
              originalLanguage: values.originalLanguage,
              releaseYear: values.releaseYear,
              releaseDate: values.releaseDate,
              completionStatus: values.completionStatus,
            }
          : {
              title: values.title,
              originalTitle: values.originalTitle,
              synopsis: values.synopsis,
              originalLanguage: values.originalLanguage,
              releaseYear: values.releaseYear,
              releaseDate: values.releaseDate,
              rightsConfirmed: values.rightsConfirmed,
              kind: type === "film" ? "movie" : "standalone",
            },
      path = type === "series" ? "/admin/series" : "/admin/videos";
    const response = await request(path, "POST", input);
    expect(response.status).toBe(201);
    const created = await response.json();
    const id = type === "series" ? created.series.id : created.id;
    if (type === "series") {
      expect(created.defaultSeason.seasonNumber).toBe(1);
      expect(created.defaultSeason.seriesId).toBe(id);
      expect(created.series).not.toHaveProperty("rightsConfirmedAt");
    }
    const detail = await (await request(path + "/" + id)).json();
    expect(detail.originalLanguage).toBe("en");
    expect(detail.rowVersion).toBe(1);
    const patch = {
      title: "Changed title",
      originalTitle: null,
      synopsis: null,
      originalLanguage: null,
      releaseYear: null,
      releaseDate: null,
      genreIds: [],
      expectedVersion: detail.rowVersion,
      ...(type === "series"
        ? { completionStatus: "ongoing" }
        : { rightsConfirmed: false }),
    };
    expect(patch.expectedVersion).toBe(1);
    expect(patch).not.toHaveProperty("kind");
    expect(patch).not.toHaveProperty("publicationStatus");
    expect((await request(path + "/" + id, "PATCH", patch)).status).toBe(200);
    const saved = await (await request(path + "/" + id)).json();
    expect(saved.title).toBe("Changed title");
    expect(saved.rowVersion).toBe(2);
    expect(saved.originalTitle).toBeNull();
    expect(saved.synopsis).toBeNull();
    expect(saved.genreIds).toEqual([]);
    if (type !== "series") expect(saved.rightsConfirmedAt).toBeNull();
    else expect(saved.completionStatus).toBe("ongoing");
    const stale = await request(path + "/" + id, "PATCH", {
      title: "Stale write",
      expectedVersion: 1,
    });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("CONTENT_VERSION_CONFLICT");
    expect((await (await request(path + "/" + id)).json()).title).toBe(
      "Changed title",
    );
  }
}, 20000);
test("genre pages, readonly lifecycle, slug conflicts and unauthorized reads use real contracts", async () => {
  const first = await (await request("/admin/genres?limit=20")).json();
  expect(first.items).toHaveLength(20);
  expect(first.nextCursor).not.toBeNull();
  const second = await (
    await request(
      "/admin/genres?limit=20&cursor=" + encodeURIComponent(first.nextCursor),
    )
  ).json();
  expect(second.items).toHaveLength(20);
  expect(
    second.items.every(
      (g: { id: string }) =>
        !first.items.some((x: { id: string }) => x.id === g.id),
    ),
  ).toBe(true);
  expect(
    (await request("/admin/content?type=film", "GET", undefined, "")).status,
  ).toBe(401);
  const create = { title: "Duplicate", slug: "ui-proof-slug", kind: "movie" };
  expect((await request("/admin/videos", "POST", create)).status).toBe(201);
  expect((await request("/admin/videos", "POST", create)).status).toBe(409);
  for (const id of [fixture.ids.filmPublished, fixture.ids.filmArchived])
    expect(
      (
        await request("/admin/videos/" + id, "PATCH", {
          expectedVersion: 1,
          title: "Illegal change",
        })
      ).status,
    ).toBe(409);
  expect(
    (
      await request("/admin/videos/" + fixture.ids.filmPublished, "PATCH", {
        expectedVersion: 1,
        kind: "standalone",
      })
    ).status,
  ).toBe(422);
});
