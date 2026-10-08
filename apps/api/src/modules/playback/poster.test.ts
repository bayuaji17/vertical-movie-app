import { expect, test } from "bun:test";
import { createPlaybackModule } from "./index";
import { PlaybackService } from "./service";
import { notFound } from "../../shared/content-error";
import { createApp } from "../../app";

test("poster HTTP is anonymous, strict and no-store; errors preserve their status", async () => {
  let reads = 0,
    sessions = 0;
  class Fixture extends PlaybackService {
    override async poster(slug: string) {
      reads++;
      if (slug === "missing") notFound();
      return {
        videoId: "00000000-0000-4000-8000-000000000001",
        posterUrl: "https://storage.invalid/poster.webp?signed=fixture",
        expiresAt: "2026-10-08T00:01:00.000Z",
      };
    }
  }
  const app = createPlaybackModule({
    service: new Fixture(),
    getSession: async () => {
      sessions++;
      return null;
    },
  });
  const good = await app.handle(new Request("http://test/videos/film/poster"));
  expect(good.status).toBe(200);
  expect(Object.keys(await good.json()).sort()).toEqual([
    "expiresAt",
    "posterUrl",
    "videoId",
  ]);
  for (const [path, status] of [
    ["/videos/Bad/poster", 422],
    ["/videos/missing/poster", 404],
  ] as const) {
    const r = await app.handle(new Request("http://test" + path));
    expect(r.status).toBe(status);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(good.headers.get("cache-control")).toBe("private, no-store");
  expect(reads).toBe(2);
  expect(sessions).toBe(0);
  expect(
    (
      await createPlaybackModule({ getSession: async () => null }).handle(
        new Request("http://test/videos/film/poster"),
      )
    ).status,
  ).toBe(503);
  expect(
    (
      await app.handle(
        new Request(
          "http://test/admin/videos/00000000-0000-4000-8000-000000000001/playback",
        ),
      )
    ).status,
  ).toBe(401);
  expect(sessions).toBe(1);
});
test("composed app documents signed poster without changing playback or binary poster contracts", async () => {
  const response = await createApp({
    requestLogger: { write: () => {} },
  }).handle(new Request("http://test/openapi/json"));
  const doc = await response.json();
  const route = doc.paths["/videos/{slug}/poster"].get;
  expect(route.operationId).toBe("getPublicVideoPoster");
  expect(route.security).toEqual([]);
  expect(
    Object.keys(
      route.responses["200"].content["application/json"].schema.properties,
    ).sort(),
  ).toEqual(["expiresAt", "posterUrl", "videoId"]);
  expect(doc.paths["/videos/{slug}/playback"].get.operationId).toBe(
    "getVideoPlayback",
  );
  expect(doc.paths["/catalog/{kind}/{id}/poster"].get).toBeDefined();
});
