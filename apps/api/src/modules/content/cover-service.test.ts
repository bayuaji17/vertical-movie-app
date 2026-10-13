import { beforeAll, expect, test } from "bun:test";
import { createContentModule } from "./index";
import { AdminCoverService, coverVersion } from "./cover-service";
import type { ThumbnailRuntime } from "./cover-service";
import type { CoverStore } from "./cover-repository";
import type { SessionInput } from "@repo/auth/types";

const id = "6f009a09-3d1c-4697-b6d5-3c2ab4c93e4c";
const key = "outputs/a/b/c/poster.webp";
const profile = { provider: "minio", bucket: "media" };
let cover: Uint8Array<ArrayBuffer>;
beforeAll(async () => {
  const png = new Uint8Array(
    await Bun.file(
      new URL(
        "../../../test/fixtures/media/browser-cover-crop.png",
        import.meta.url,
      ),
    ).arrayBuffer(),
  );
  cover = new Uint8Array(
    await new Bun.Image(png)
      .resize(1080, 1920, { fit: "fill" })
      .webp({ quality: 80 })
      .bytes(),
  );
});

function fixture(
  options: {
    row?: { provider: string; bucket: string; key: string } | undefined;
    source?: () => Uint8Array;
    thumbnail?: ThumbnailRuntime;
    maxEntries?: number;
  } = {},
) {
  const calls = { store: 0, stat: 0, read: 0, resize: 0 };
  const row = "row" in options ? options.row : { ...profile, key };
  const store: CoverStore = {
    cover: async () => {
      calls.store++;
      return row;
    },
  };
  const storage = {
    stat: async () => {
      calls.stat++;
      return { size: (options.source?.() ?? cover).byteLength };
    },
    file: () => ({
      stream: () => {
        calls.read++;
        const bytes = options.source?.() ?? cover;
        return new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        });
      },
    }),
  } as never;
  const thumbnail: ThumbnailRuntime =
    options.thumbnail ??
    (async () => new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]));
  const service = new AdminCoverService(store, storage, profile, {
    thumbnail: async (bytes) => {
      calls.resize++;
      return thumbnail(bytes);
    },
    maxEntries: options.maxEntries,
  });
  return { service, calls };
}
const code = (promise: Promise<unknown>) =>
  promise.then(
    () => "ok",
    (error: { code?: string }) => error.code ?? "error",
  );

test("a cover becomes a small WebP with a version tag and a short private cache", async () => {
  const { service } = fixture({
    thumbnail: async () => new Uint8Array([1, 2, 3]),
  });
  const response = await service.get("film", id, null);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("content-length")).toBe("3");
  expect(response.headers.get("etag")).toBe(`"${coverVersion(key)}"`);
  expect(response.headers.get("cache-control")).toBe("private, max-age=300");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  expect(coverVersion(key)).toHaveLength(16);
  expect(coverVersion(key)).not.toBe(coverVersion(key + "x"));
});
test("the real resize makes a portrait WebP far smaller than the stored cover", async () => {
  const service = new AdminCoverService(
    { cover: async () => ({ ...profile, key }) },
    {
      stat: async () => ({ size: cover.byteLength }),
      file: () => ({ stream: () => new Blob([cover]).stream() }),
    } as never,
    profile,
  );
  const response = await service.get("film", id, null);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const meta = await new Bun.Image(bytes).metadata();
  expect(meta.format).toBe("webp");
  expect(meta.width).toBeLessThanOrEqual(90);
  expect(meta.height).toBeLessThanOrEqual(160);
  expect(meta.height / meta.width).toBeCloseTo(1920 / 1080, 1);
  expect(bytes.byteLength).toBeLessThan(cover.byteLength / 4);
});
test("the thumbnail is made once and then served from memory", async () => {
  const { service, calls } = fixture();
  await service.get("film", id, null);
  await service.get("film", id, null);
  await service.get("film", id, null);
  expect(calls).toMatchObject({ store: 3, read: 1, resize: 1 });
});
test("a matching ETag answers 304 without reading storage or resizing", async () => {
  const { service, calls } = fixture();
  const etag = `"${coverVersion(key)}"`;
  for (const header of [etag, `W/${etag}`, `"other", ${etag}`, "*"]) {
    const response = await service.get("film", id, header);
    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe(etag);
    expect(await response.text()).toBe("");
  }
  expect(calls).toMatchObject({ read: 0, resize: 0 });
  expect((await service.get("film", id, '"stale"')).status).toBe(200);
});
test("a missing cover is 404; missing storage, foreign bucket or a bad object is 503", async () => {
  expect(
    await code(fixture({ row: undefined }).service.get("film", id, null)),
  ).toBe("CONTENT_NOT_FOUND");
  expect(await code(new AdminCoverService().get("film", id, null))).toBe(
    "CONTENT_DEPENDENCY_UNAVAILABLE",
  );
  expect(
    await code(
      fixture({ row: { provider: "minio", bucket: "other", key } }).service.get(
        "film",
        id,
        null,
      ),
    ),
  ).toBe("CONTENT_DEPENDENCY_UNAVAILABLE");
  // Not a WebP container, and a resize that fails or returns nothing.
  expect(
    await code(
      fixture({ source: () => new Uint8Array(64).fill(7) }).service.get(
        "film",
        id,
        null,
      ),
    ),
  ).toBe("CONTENT_DEPENDENCY_UNAVAILABLE");
  expect(
    await code(
      fixture({
        thumbnail: async () => {
          throw new Error("native failure with private detail");
        },
      }).service.get("film", id, null),
    ),
  ).toBe("CONTENT_DEPENDENCY_UNAVAILABLE");
  expect(
    await code(
      fixture({ thumbnail: async () => new Uint8Array(0) }).service.get(
        "film",
        id,
        null,
      ),
    ),
  ).toBe("CONTENT_DEPENDENCY_UNAVAILABLE");
});
test("the memory cache is bounded and drops the least recently used entry", async () => {
  let current = 0;
  const keys = [
    "outputs/1/poster.webp",
    "outputs/2/poster.webp",
    "outputs/3/poster.webp",
  ];
  const calls = { resize: 0 };
  const service = new AdminCoverService(
    { cover: async () => ({ ...profile, key: keys[current]! }) },
    {
      stat: async () => ({ size: cover.byteLength }),
      file: () => ({ stream: () => new Blob([cover]).stream() }),
    } as never,
    profile,
    {
      maxEntries: 2,
      thumbnail: async () => {
        calls.resize++;
        return new Uint8Array([1]);
      },
    },
  );
  const fetch = async (n: number) => {
    current = n;
    await service.get("film", id, null);
  };
  await fetch(0);
  await fetch(1);
  await fetch(0); // 0 is now the most recent
  await fetch(2); // evicts 1
  expect(calls.resize).toBe(3);
  await fetch(0);
  await fetch(2);
  expect(calls.resize).toBe(3); // both still cached
  await fetch(1);
  expect(calls.resize).toBe(4); // was evicted
});
test("at most two resizes run at once", async () => {
  let active = 0,
    peak = 0;
  const keys = [1, 2, 3, 4, 5].map((n) => `outputs/${n}/poster.webp`);
  let next = 0;
  const service = new AdminCoverService(
    { cover: async () => ({ ...profile, key: keys[next++]! }) },
    {
      stat: async () => ({ size: cover.byteLength }),
      file: () => ({ stream: () => new Blob([cover]).stream() }),
    } as never,
    profile,
    {
      thumbnail: async () => {
        active++;
        peak = Math.max(peak, active);
        await Bun.sleep(30);
        active--;
        return new Uint8Array([1]);
      },
    },
  );
  await Promise.all(keys.map(() => service.get("film", id, null)));
  expect(peak).toBe(2);
});

const admin: SessionInput = {
  user: {
    id: "admin",
    name: "Admin",
    email: "a@example.test",
    role: "admin",
    banned: false,
  },
  session: { expiresAt: new Date(Date.now() + 60000) },
};
test("the route is admin-only, validates its parameters and sets the cache header", async () => {
  const { service } = fixture({ thumbnail: async () => new Uint8Array([9]) });
  const app = (session: SessionInput | null) =>
    createContentModule({ covers: service, getSession: async () => session });
  const url = `http://localhost/admin/content/film/${id}/cover`;
  expect((await app(null).handle(new Request(url))).status).toBe(401);
  expect(
    (
      await app({ ...admin, user: { ...admin.user, role: "user" } }).handle(
        new Request(url),
      )
    ).status,
  ).toBe(403);
  const ok = await app(admin).handle(new Request(url));
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toBe("private, max-age=300");
  expect(ok.headers.get("content-type")).toBe("image/webp");
  const again = await app(admin).handle(
    new Request(url, { headers: { "if-none-match": ok.headers.get("etag")! } }),
  );
  expect(again.status).toBe(304);
  for (const bad of [
    `/admin/content/episode/${id}/cover`,
    `/admin/content/film/not-a-uuid/cover`,
  ])
    expect(
      (await app(admin).handle(new Request(`http://localhost${bad}`))).status,
    ).toBe(422);
});
