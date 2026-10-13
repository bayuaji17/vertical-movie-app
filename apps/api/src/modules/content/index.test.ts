import { expect, test } from "bun:test";
import { createContentModule } from "./index";
import { ContentPageService } from "./service";
import type { SessionInput } from "@repo/auth/types";
const admin: SessionInput = {
  user: {
    id: "admin",
    name: "Admin",
    email: "admin@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60000) },
};
function fixture(session: SessionInput | null = admin) {
  const inputs: unknown[] = [];
  const service = new ContentPageService({
    list: async (input) => {
      inputs.push(input);
      return {
        items: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: 0,
      };
    },
  });
  return {
    inputs,
    app: createContentModule({ service, getSession: async () => session }),
  };
}
test("authorization blocks missing/non-admin sessions before listing", async () => {
  for (const [session, code] of [
    [null, 401],
    [{ ...admin, user: { ...admin!.user, role: "user" } }, 403],
  ] as const) {
    const { app, inputs } = fixture(session);
    expect(
      (
        await app.handle(
          new Request("http://localhost/admin/content?type=film"),
        )
      ).status,
    ).toBe(code);
    expect(inputs).toHaveLength(0);
  }
});
test("all three resource pages normalize filters and keep no-store", async () => {
  for (const type of ["film", "standalone", "series"]) {
    const { app, inputs } = fixture();
    const res = await app.handle(
      new Request(
        `http://localhost/admin/content?type=${type}&page=4&pageSize=3&search=%20Rain%20&includeArchived=true`,
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({
      items: [],
      total: 0,
      page: 4,
      pageSize: 3,
      totalPages: 0,
    });
    expect(inputs).toEqual([
      {
        type,
        page: 4,
        pageSize: 3,
        search: "Rain",
        status: "all",
        sort: "updated",
        order: "desc",
      },
    ]);
  }
});
test("default pages and malformed/out-of-bounds inputs", async () => {
  const { app, inputs } = fixture();
  expect(
    (await app.handle(new Request("http://localhost/admin/content?type=film")))
      .status,
  ).toBe(200);
  expect(inputs[0]).toEqual({
    type: "film",
    page: 1,
    pageSize: 10,
    search: undefined,
    status: "active",
    sort: "updated",
    order: "desc",
  });
  for (const query of [
    "type=episode",
    "type=film&page=0",
    "type=film&page=1000001",
    "type=film&pageSize=101",
    "type=film&pageSize=1.5",
    "type=film&includeArchived=yes",
    "type=film&sort=size",
    "type=film&order=up",
    "type=film&status=everything",
    "type=film&status=",
    "type=film&sort=",
  ])
    expect(
      (await app.handle(new Request(`http://localhost/admin/content?${query}`)))
        .status,
    ).toBe(422);
  expect(inputs).toHaveLength(1);
});
test("unconfigured dependency is a typed 503", async () => {
  const app = createContentModule({ getSession: async () => admin });
  const res = await app.handle(
    new Request("http://localhost/admin/content?type=film"),
  );
  expect(res.status).toBe(503);
  expect((await res.json()).error.code).toBe("CONTENT_DEPENDENCY_UNAVAILABLE");
});

test("status, sort and order are validated, defaulted and passed on", async () => {
  const { app, inputs } = fixture();
  const get = (query: string) =>
    app.handle(
      new Request(`http://localhost/admin/content?type=film&${query}`),
    );
  for (const query of [
    "status=draft",
    "status=published&sort=created&order=asc",
    "status=archived&sort=title",
    "sort=status",
    "status=all&sort=updated&order=desc",
  ])
    expect((await get(query)).status).toBe(200);
  expect(inputs.map((i) => i)).toMatchObject([
    { status: "draft", sort: "updated", order: "desc" },
    { status: "published", sort: "created", order: "asc" },
    // Text columns read naturally from A to Z unless told otherwise.
    { status: "archived", sort: "title", order: "asc" },
    { status: "active", sort: "status", order: "asc" },
    { status: "all", sort: "updated", order: "desc" },
  ]);
});
test("the legacy includeArchived flag still maps to active/all and status wins", async () => {
  const { app, inputs } = fixture();
  const get = (query: string) =>
    app.handle(
      new Request(`http://localhost/admin/content?type=series&${query}`),
    );
  for (const query of [
    "includeArchived=true",
    "includeArchived=false",
    "includeArchived=true&status=draft",
    "includeArchived=false&status=all",
  ])
    expect((await get(query)).status).toBe(200);
  expect(inputs.map((i) => (i as { status: string }).status)).toEqual([
    "all",
    "active",
    "draft",
    "all",
  ]);
});
