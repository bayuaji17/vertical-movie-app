import { expect, test } from "bun:test";
import { ContentError } from "../../shared/content-error";
import { GenresService } from "./service";
import type { GenreRow, GenresRepository } from "./repository";

const id = "00000000-0000-4000-8000-0000000000aa";
const at = new Date("2026-10-10T00:00:00.000Z");
const row = (over: Partial<GenreRow> = {}): GenreRow => ({
  id,
  name: "Drama",
  slug: "drama",
  createdAt: at,
  updatedAt: at,
  usageCount: 3,
  ...over,
});
function fake(over: Partial<GenresRepository> = {}) {
  const calls: string[] = [];
  const repository = {
    insert: async () => row(),
    list: async () => [],
    find: async () => row(),
    update: async () => true,
    remove: async () => true,
    ...over,
  } as unknown as GenresRepository;
  let invalidations = 0;
  const service = new GenresService(
    repository,
    { id: () => id, now: () => new Date("2026-10-10T01:00:00.000Z") },
    () => {
      invalidations++;
    },
  );
  return { service, calls, invalidations: () => invalidations };
}
const expectCode = async (
  promise: Promise<unknown>,
  code: string,
  status: 404 | 409 | 422 | 503,
) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ContentError);
  expect((error as ContentError).code).toBe(code);
  expect((error as ContentError).httpStatus).toBe(status);
};

test("update validates input before touching storage", async () => {
  let writes = 0;
  const { service } = fake({
    update: async () => {
      writes++;
      return true;
    },
  });
  const token = at.toISOString();
  await expectCode(
    service.update(id, { expectedUpdatedAt: token }),
    "VALIDATION_ERROR",
    422,
  );
  await expectCode(
    service.update(id, {
      expectedUpdatedAt: "not-a-date-at-all-xx",
      name: "A",
    }),
    "VALIDATION_ERROR",
    422,
  );
  await expectCode(
    service.update(id, { expectedUpdatedAt: token, name: "   " }),
    "VALIDATION_ERROR",
    422,
  );
  await expectCode(
    service.update(id, { expectedUpdatedAt: token, slug: "Bad Slug" }),
    "VALIDATION_ERROR",
    422,
  );
  expect(writes).toBe(0);
});

test("update sends the read token, trims the name and invalidates caches once", async () => {
  const seen: unknown[] = [];
  const { service, invalidations } = fake({
    update: async (...args: unknown[]) => {
      seen.push(args);
      return true;
    },
    find: async () =>
      row({
        name: "Dramas",
        slug: "dramas",
        updatedAt: new Date("2026-10-10T01:00:00.000Z"),
      }),
  });
  const result = await service.update(id, {
    expectedUpdatedAt: at.toISOString(),
    name: "  Dramas  ",
    slug: "dramas",
  });
  expect(seen).toEqual([
    [
      id,
      at.toISOString(),
      {
        name: "Dramas",
        slug: "dramas",
        updatedAt: new Date("2026-10-10T01:00:00.000Z"),
      },
    ],
  ]);
  expect(result).toMatchObject({
    name: "Dramas",
    slug: "dramas",
    usageCount: 3,
  });
  expect(result.updatedAt).toBe("2026-10-10T01:00:00.000Z");
  expect(invalidations()).toBe(1);
});

test("a stale token is a version conflict, a missing genre is 404, neither invalidates", async () => {
  const stale = fake({ update: async () => false });
  await expectCode(
    stale.service.update(id, {
      expectedUpdatedAt: at.toISOString(),
      name: "X",
    }),
    "GENRE_VERSION_CONFLICT",
    409,
  );
  const missing = fake({
    update: async () => false,
    find: async () => undefined,
  });
  await expectCode(
    missing.service.update(id, {
      expectedUpdatedAt: at.toISOString(),
      name: "X",
    }),
    "CONTENT_NOT_FOUND",
    404,
  );
  expect(stale.invalidations() + missing.invalidations()).toBe(0);
});

test("delete maps a reference violation to GENRE_IN_USE and keeps caches untouched", async () => {
  // Bun SQL reports RESTRICT as errno 23001 on the cause; 23503 is NO ACTION.
  for (const errno of ["23001", "23503"]) {
    const used = fake({
      remove: async () => {
        throw Object.assign(new Error("fk"), {
          cause: { code: "ERR_POSTGRES_SERVER_ERROR", errno },
        });
      },
    });
    await expectCode(used.service.remove(id), "GENRE_IN_USE", 409);
    expect(used.invalidations()).toBe(0);
  }

  const gone = fake({ remove: async () => false });
  await expectCode(gone.service.remove(id), "CONTENT_NOT_FOUND", 404);

  const broken = fake({
    remove: async () => {
      throw new Error("connection lost");
    },
  });
  await expect(broken.service.remove(id)).rejects.toThrow("connection lost");

  const ok = fake();
  expect(await ok.service.remove(id)).toEqual({ id });
  expect(ok.invalidations()).toBe(1);
});

test("list and create expose usageCount", async () => {
  const { service } = fake({ list: async () => [row({ usageCount: 7 })] });
  expect((await service.list({})).items[0]?.usageCount).toBe(7);
  expect((await service.create({ name: "Drama" })).usageCount).toBe(3);
});
