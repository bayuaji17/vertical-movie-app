import { test, expect } from "bun:test";
import { createGenresModule } from "./index";
import { GenresService } from "./service";
test("genre create is denied before querying without admin", async () => {
  const service = new GenresService();
  let calls = 0;
  service.create = async () => {
    calls++;
    throw new Error("Forbidden call");
  };
  const app = createGenresModule({ service, getSession: async () => null });
  const r = await app.handle(
    new Request("http://localhost/admin/genres", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Drama" }),
    }),
  );
  expect(r.status).toBe(401);
  expect(calls).toBe(0);
});

import type { SessionInput } from "@repo/auth/types";
import type { GenresRepository, GenreRow } from "./repository";
const adminSession: SessionInput = {
  user: {
    id: "admin",
    name: "Admin",
    email: "admin@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60000) },
};
const genreId = "00000000-0000-4000-8000-0000000000aa";
const genreAt = new Date("2026-10-10T00:00:00.000Z");
const genreRow = (): GenreRow => ({
  id: genreId,
  name: "Drama",
  slug: "drama",
  createdAt: genreAt,
  updatedAt: genreAt,
  usageCount: 2,
});
function adminApp(over: Partial<GenresRepository> = {}) {
  const service = new GenresService({
    insert: async () => genreRow(),
    list: async () => [],
    find: async () => genreRow(),
    update: async () => true,
    remove: async () => true,
    ...over,
  } as unknown as GenresRepository);
  return createGenresModule({ service, getSession: async () => adminSession });
}
const patch = (body: unknown) =>
  new Request(`http://localhost/admin/genres/${genreId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("genre update and delete are denied before reaching the service", async () => {
  for (const [session, status] of [
    [null, 401],
    [{ ...adminSession, user: { ...adminSession.user, role: "user" } }, 403],
  ] as const) {
    let calls = 0;
    const service = new GenresService();
    service.update = async () => {
      calls++;
      throw new Error("unexpected");
    };
    service.remove = async () => {
      calls++;
      throw new Error("unexpected");
    };
    const app = createGenresModule({
      service,
      getSession: async () => session,
    });
    expect(
      (
        await app.handle(
          patch({ expectedUpdatedAt: genreAt.toISOString(), name: "X" }),
        )
      ).status,
    ).toBe(status);
    expect(
      (
        await app.handle(
          new Request(`http://localhost/admin/genres/${genreId}`, {
            method: "DELETE",
          }),
        )
      ).status,
    ).toBe(status);
    expect(calls).toBe(0);
  }
});

test("PATCH validates the body strictly and returns the updated genre with usage", async () => {
  const app = adminApp();
  const ok = await app.handle(
    patch({ expectedUpdatedAt: genreAt.toISOString(), name: "Drama" }),
  );
  expect(ok.status).toBe(200);
  expect(await ok.json()).toMatchObject({ id: genreId, usageCount: 2 });
  for (const body of [
    { name: "No token" },
    { expectedUpdatedAt: genreAt.toISOString(), slug: "Bad Slug" },
    { expectedUpdatedAt: genreAt.toISOString(), extra: true },
    { expectedUpdatedAt: genreAt.toISOString(), name: "x".repeat(81) },
  ])
    expect((await adminApp().handle(patch(body))).status).toBe(422);
  const badId = await app.handle(
    new Request("http://localhost/admin/genres/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expectedUpdatedAt: genreAt.toISOString(),
        name: "A",
      }),
    }),
  );
  expect(badId.status).toBe(422);
});

test("HTTP errors carry stable codes for conflicts, missing and in-use genres", async () => {
  const stale = await adminApp({ update: async () => false }).handle(
    patch({ expectedUpdatedAt: genreAt.toISOString(), name: "X" }),
  );
  expect(stale.status).toBe(409);
  expect((await stale.json()).error.code).toBe("GENRE_VERSION_CONFLICT");

  const used = await adminApp({
    remove: async () => {
      throw Object.assign(new Error("fk"), {
        cause: { code: "ERR_POSTGRES_SERVER_ERROR", errno: "23001" },
      });
    },
  }).handle(
    new Request(`http://localhost/admin/genres/${genreId}`, {
      method: "DELETE",
    }),
  );
  expect(used.status).toBe(409);
  expect((await used.json()).error.code).toBe("GENRE_IN_USE");

  const gone = await adminApp({ remove: async () => false }).handle(
    new Request(`http://localhost/admin/genres/${genreId}`, {
      method: "DELETE",
    }),
  );
  expect(gone.status).toBe(404);

  const deleted = await adminApp().handle(
    new Request(`http://localhost/admin/genres/${genreId}`, {
      method: "DELETE",
    }),
  );
  expect(deleted.status).toBe(200);
  expect(await deleted.json()).toEqual({ id: genreId });
});
