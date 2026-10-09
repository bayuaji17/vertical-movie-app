import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
  createAdminAuthServer,
  generateAuthOpenAPISchema,
} from "@repo/auth/server";
import { createApp } from "../../src/app";
import { session, user, videos } from "../../src/db/schema";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { GenresService } from "../../src/modules/genres/service";
import { createGenresRepository } from "../../src/modules/genres/repository";
import { resetContentDatabase } from "./content-fixture";

const origin = "http://localhost:3000";
const password = "content-proof-password-only-for-test-2026";
let database: Awaited<ReturnType<typeof resetContentDatabase>>;
let app: ReturnType<typeof createApp>;
let auth: ReturnType<typeof createAdminAuthServer>;
let cookie: string, ordinaryCookie: string, adminId: string;
function request(
  path: string,
  method = "GET",
  body?: unknown,
  sessionCookie = cookie,
) {
  return app.handle(
    new Request(`${origin}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        origin,
        ...(sessionCookie ? { cookie: sessionCookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}
async function login(email: string) {
  const response = await request(
    "/api/auth/sign-in/email",
    "POST",
    { email, password },
    "",
  );
  expect(response.status).toBe(200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
beforeAll(async () => {
  database = await resetContentDatabase();
  await database.db
    .update(user)
    .set({ role: "user" })
    .where(eq(user.id, "content-admin"));
  auth = createAdminAuthServer({
    database: database.db,
    origin,
    secret: "content-http-proof-secret-never-use-outside-this-test",
    secureCookies: false,
  });
  const admin = await auth.api.createUser({
    body: {
      email: "content-native-admin@example.test",
      name: "Content Admin",
      password,
      role: "admin",
    },
  });
  adminId = admin.user.id;
  await auth.api.createUser({
    body: {
      email: "content-native-user@example.test",
      name: "Content User",
      password,
      role: "user",
    },
  });
  app = createApp({
    auth,
    authOpenApiSchema: await generateAuthOpenAPISchema(auth),
    getSession: (input) => auth.api.getSession(input),
    seriesService: new SeriesService(createSeriesRepository(database.db)),
    videosService: new VideosService(createVideosRepository(database.db)),
    genresService: new GenresService(createGenresRepository(database.db)),
  });
  cookie = await login("content-native-admin@example.test");
  ordinaryCookie = await login("content-native-user@example.test");
}, 20000);
afterAll(async () => {
  await database?.client.close();
});

test("native auth blocks anonymous and ordinary users before content writes", async () => {
  for (const [sessionCookie, status] of [
    ["", 401],
    [ordinaryCookie, 403],
  ] as const) {
    const response = await request(
      "/admin/videos",
      "POST",
      { kind: "movie", title: "Denied" },
      sessionCookie,
    );
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).error.requestId).toBeString();
  }
  expect(await database.db.select().from(videos)).toHaveLength(0);
  expect((await request("/", "GET", undefined, "")).status).toBe(200);
});

test("native admin creates multi-season metadata, genre inheritance, edits and archives through HTTP", async () => {
  const genreResponse = await request("/admin/genres", "POST", {
    name: "Native Drama",
  });
  expect(genreResponse.status).toBe(201);
  const genre = await genreResponse.json();
  const parentResponse = await request("/admin/series", "POST", {
    title: "Native Series",
    genreIds: [genre.id],
  });
  expect(parentResponse.status).toBe(201);
  const parent = await parentResponse.json();
  expect(parent.defaultSeason.seasonNumber).toBe(1);
  const seasonResponse = await request(
    `/admin/series/${parent.series.id}/seasons`,
    "POST",
    { seasonNumber: 2 },
  );
  expect(seasonResponse.status).toBe(201);
  const season = await seasonResponse.json();
  const episodeResponse = await request("/admin/videos", "POST", {
    kind: "episode",
    title: "Episode Two",
    seasonId: season.id,
    episodeNumber: 1,
  });
  expect(episodeResponse.status).toBe(201);
  const episode = await episodeResponse.json();
  const detail = await (await request(`/admin/videos/${episode.id}`)).json();
  expect(detail.series.id).toBe(parent.series.id);
  expect(detail.season.seasonNumber).toBe(2);
  expect(detail.effectiveGenres.map((g: { id: string }) => g.id)).toEqual([
    genre.id,
  ]);
  const duplicate = await request("/admin/videos", "POST", {
    kind: "episode",
    title: "Duplicate Number",
    seasonId: season.id,
    episodeNumber: 1,
  });
  expect(duplicate.status).toBe(409);
  expect((await duplicate.json()).error.code).toBe("EPISODE_NUMBER_CONFLICT");
  const movieResponse = await request("/admin/videos", "POST", {
    kind: "movie",
    title: "Feature Movie",
    releaseYear: 2026,
    releaseDate: "2026-10-03",
    originalLanguage: "id",
    rightsConfirmed: true,
  });
  expect(movieResponse.status).toBe(201);
  const movie = await movieResponse.json();
  expect(movie.seasonId).toBeNull();
  expect(movie.publicationStatus).toBe("draft");
  const edited = await request(`/admin/videos/${movie.id}`, "PATCH", {
    expectedVersion: 1,
    title: "Edited Feature",
  });
  expect(edited.status).toBe(200);
  expect((await edited.json()).rowVersion).toBe(2);
  expect(
    (
      await request(`/admin/videos/${movie.id}`, "PATCH", {
        expectedVersion: 1,
        title: "Stale",
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(`/admin/videos/${movie.id}/archive`, "POST", {
        expectedVersion: 2,
      })
    ).status,
  ).toBe(200);
  const archived = await (await request(`/admin/videos/${movie.id}`)).json();
  expect(archived.title).toBe("Edited Feature");
  expect(archived.archivedAt).not.toBeNull();
  expect(
    (await (await request("/admin/videos?kind=movie")).json()).items,
  ).toHaveLength(0);
  expect(
    (
      await (
        await request("/admin/videos?kind=movie&includeArchived=true")
      ).json()
    ).items,
  ).toHaveLength(1);
  expect(
    (
      await request(`/admin/seasons/${season.id}/archive`, "POST", {
        expectedVersion: 1,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(`/admin/series/${parent.series.id}/archive`, "POST", {
        expectedVersion: 1,
      })
    ).status,
  ).toBe(200);
});

test("HTTP validation rejects privileged fields and invalid grouping, metadata and cursors", async () => {
  for (const body of [
    { kind: "movie", title: "Invalid", seasonId: Bun.randomUUIDv7() },
    { kind: "episode", title: "Invalid" },
    { kind: "movie", title: "Invalid", publicationStatus: "published" },
    {
      kind: "movie",
      title: "Invalid",
      releaseYear: 2025,
      releaseDate: "2026-10-03",
    },
    { kind: "movie", title: "Invalid", releaseDate: "2026-02-30" },
  ]) {
    const response = await request("/admin/videos", "POST", body);
    expect(response.status).toBe(422);
    expect((await response.json()).error.requestId).toBeString();
  }
  for (const query of [
    "limit=101",
    "cursor=broken",
    "seasonId=bad-id",
    "unknown=1",
  ]) {
    expect((await request(`/admin/videos?${query}`)).status).toBe(422);
  }
  const missing = await request(`/admin/videos/${Bun.randomUUIDv7()}`);
  expect(missing.status).toBe(404);
  expect((await request("/admin/videos/publish", "POST", {})).status).toBe(404);
});

test("merged Scalar documents auth and every business operation with resolvable schema references", async () => {
  const response = await request("/openapi/json", "GET", undefined, "");
  expect(response.status).toBe(200);
  const document = await response.json();
  expect(document.openapi).toBe("3.1.1");
  expect(document.paths["/api/auth/sign-in/email"].post).toBeDefined();
  let count = 0;
  const operationIds: string[] = [];
  for (const [path, item] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(
      item as Record<string, { operationId?: string; security?: unknown }>,
    )) {
      if (!["get", "post", "patch", "delete", "put"].includes(method)) continue;
      if (operation.operationId) operationIds.push(operation.operationId);
      if (path.startsWith("/admin/")) {
        count++;
        expect(operation.security).toEqual([{ betterAuthSessionCookie: [] }]);
      }
    }
  }
  expect(count).toBe(32);
  for (const id of [
    "initiateMediaUpload",
    "getMediaUpload",
    "signMediaUploadPart",
    "completeMediaUpload",
    "abortMediaUpload",
    "publishVideo",
    "publishSeries",
    "seriesPublicationReadiness",
    "getVideoPreview",
    "getVideoPreviewMaster",
    "getVideoPreviewVariant",
    "getVideoMasterPlaylist",
  ])
    expect(operationIds).toContain(id);
  expect(new Set(operationIds).size).toBe(operationIds.length);
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (
        key === "$ref" &&
        typeof value === "string" &&
        value.startsWith("#/")
      ) {
        let target: unknown = document;
        for (const part of value.slice(2).split("/")) {
          target = (target as Record<string, unknown>)?.[
            part.replaceAll("~1", "/").replaceAll("~0", "~")
          ];
        }
        expect(target).toBeDefined();
      } else visit(value);
    }
  };
  visit(document);
});

test("native authorization rejects cached banned and expired sessions; outage is safe", async () => {
  await database.db
    .update(user)
    .set({ banned: true })
    .where(eq(user.id, adminId));
  expect(
    (await auth.api.getSession({ headers: new Headers({ cookie }) }))?.user
      .banned,
  ).toBe(false);
  expect((await request("/admin/videos")).status).toBe(403);
  await database.db
    .update(user)
    .set({ banned: false })
    .where(eq(user.id, adminId));
  await database.db
    .update(session)
    .set({ expiresAt: new Date(0) })
    .where(eq(session.userId, adminId));
  expect((await request("/admin/videos")).status).toBe(401);
  const failedApp = createApp({
    getSession: async () => {
      throw new Error("private connection detail");
    },
  });
  const response = await failedApp.handle(
    new Request(`${origin}/admin/videos`),
  );
  expect(response.status).toBe(503);
  const body = await response.text();
  expect(body).toContain("AUTH_DEPENDENCY_UNAVAILABLE");
  expect(body).not.toContain("private connection detail");
});
