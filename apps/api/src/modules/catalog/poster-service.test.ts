import { expect, test } from "bun:test";
import type { S3Client } from "bun";
import { CatalogPosterService, publicPosterMaxBytes } from "./poster-service";
import type { HomeStore } from "./home-repository";
import { createCatalogModule } from "./index";
const id = "10000000-0000-4000-8000-000000000001";
const row = {
  key: "outputs/fixture/poster.webp",
  provider: "minio",
  bucket: "test",
};
const image = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  "base64",
);
function fixture(
  options: {
    hidden?: boolean;
    size?: number;
    bytes?: Uint8Array;
    hideDuringRead?: boolean;
    provider?: string;
    fail?: boolean;
  } = {},
) {
  let lookups = 0,
    reads = 0;
  const store: HomeStore = {
    page: async () => ({ items: [], total: 0, nextCursor: null }),
    genres: async () => ({ items: [], nextCursor: null }),
    poster: async () => {
      lookups++;
      return options.hidden || (options.hideDuringRead && lookups > 1)
        ? undefined
        : { ...row, provider: options.provider ?? row.provider };
    },
  };
  const native = {
    stat: async () => ({ size: options.size ?? image.length }),
    file: () => {
      reads++;
      return {
        stream: () =>
          new ReadableStream({
            start(controller) {
              if (options.fail)
                controller.error(Error("private storage error"));
              else {
                controller.enqueue(options.bytes ?? image);
                controller.close();
              }
            },
          }),
      };
    },
  } as unknown as Pick<S3Client, "stat" | "file">;
  return {
    service: new CatalogPosterService(store, native, row),
    reads: () => reads,
  };
}
test("poster returns bounded bytes, WebP MIME, no-store, without signed URL", async () => {
  const f = fixture(),
    r = await f.service.get("movie", id);
  expect(r.headers.get("content-type")).toBe("image/webp");
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(r.headers.get("location")).toBeNull();
  expect(Buffer.from(await r.arrayBuffer())).toEqual(image);
  expect(f.reads()).toBe(1);
});
test("hidden/profile-conflicting/oversized outputs do not read storage; invalid bytes and raced hide fail safely", async () => {
  for (const options of [
    { hidden: true },
    { provider: "r2" },
    { size: publicPosterMaxBytes + 1 },
  ]) {
    const f = fixture(options);
    await expect(f.service.get("series", id)).rejects.toBeDefined();
    expect(f.reads()).toBe(0);
  }
  for (const options of [
    { bytes: new Uint8Array(image.length) },
    { size: 12, bytes: new Uint8Array(publicPosterMaxBytes + 1) },
    { hideDuringRead: true },
    { fail: true },
  ])
    await expect(
      fixture(options).service.get("movie", id),
    ).rejects.toBeDefined();
});
test("native HTTP public poster validates identifiers before I/O and never accepts episodes", async () => {
  const app = createCatalogModule(undefined, fixture().service);
  expect(
    (
      await app.handle(
        new Request(`http://localhost/catalog/movie/${id}/poster`),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await app.handle(
        new Request(`http://localhost/catalog/episode/${id}/poster`),
      )
    ).status,
  ).toBe(422);
  expect(
    (
      await app.handle(
        new Request("http://localhost/catalog/movie/not-an-id/poster"),
      )
    ).status,
  ).toBe(422);
  const hidden = createCatalogModule(
    undefined,
    fixture({ hidden: true }).service,
  );
  const r = await hidden.handle(
    new Request(`http://localhost/catalog/movie/${id}/poster`),
  );
  expect(r.status).toBe(404);
  expect(r.headers.get("cache-control")).toBe("private, no-store");
});
