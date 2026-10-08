import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { createAdminAuthServer } from "@repo/auth/server";
import { createApp } from "../../src/app";
import {
  mediaAssets,
  mediaJobs,
  series,
  videos,
  uploadSessions,
  contentOperations,
} from "../../src/db/schema";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { PublicationService } from "../../src/modules/publication/service";
import { SeriesPublicationEvidenceStore } from "../../src/modules/publication/readiness";
import { CatalogService } from "../../src/modules/catalog/service";
import { CatalogStore } from "../../src/modules/catalog/repository";
import { resetMediaDatabase } from "./media-fixture";

const origin = "http://localhost:3000";
const password = "aser-dedicated-proof-password-2026";
let db: Awaited<ReturnType<typeof resetMediaDatabase>>;
let app: ReturnType<typeof createApp>;
let publication: PublicationService;
let cookie: string, ordinary: string, actor: string;
function request(
  path: string,
  method = "GET",
  body?: unknown,
  sessionCookie = cookie,
) {
  return app.handle(
    new Request(origin + path, {
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
async function json(
  path: string,
  method = "GET",
  body?: unknown,
  status = 200,
) {
  const response = await request(path, method, body);
  expect(response.status).toBe(status);
  return response.json();
}
async function failure(
  path: string,
  method: string,
  body: unknown,
  code: string,
  status = 409,
) {
  expect((await json(path, method, body, status)).error.code).toBe(code);
}
const intent = (expectedVersion = 1) => ({
  expectedVersion,
  idempotencyKey: crypto.randomUUID(),
});
beforeAll(async () => {
  db = await resetMediaDatabase();
  await db.client`UPDATE "user" SET role='user' WHERE id='media-admin'`;
  const auth = createAdminAuthServer({
    database: db.db,
    origin,
    secret: "aser-native-proof-secret-never-use-outside-test",
    secureCookies: false,
  });
  for (const role of ["admin", "user"] as const) {
    const result = await auth.api.createUser({
      body: { email: `aser-${role}@example.test`, name: role, password, role },
    });
    if (role === "admin") actor = result.user.id;
  }
  const catalog = new CatalogService(new CatalogStore(db.db));
  publication = new PublicationService(db.db, catalog.invalidate);
  app = createApp({
    auth,
    getSession: (input) => auth.api.getSession(input),
    requestLogger: { write: () => {} },
    publicationService: publication,
    catalogService: catalog,
    seriesService: new SeriesService(
      createSeriesRepository(db.db),
      undefined,
      catalog.invalidate,
    ),
    videosService: new VideosService(
      createVideosRepository(db.db),
      undefined,
      catalog.invalidate,
    ),
  });
  for (const role of ["admin", "user"] as const) {
    const response = await request(
      "/api/auth/sign-in/email",
      "POST",
      { email: `aser-${role}@example.test`, password },
      "",
    );
    expect(response.status).toBe(200);
    const value = response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    if (role === "admin") cookie = value;
    else ordinary = value;
  }
}, 20000);
afterAll(async () => {
  await db?.client.close();
});
// SQL-ready assets isolate predicate/race tests. Actual bytes/FFmpeg/storage
// are covered separately by the owned series-media browser fixture.
async function ready(
  owner: "series" | "video",
  ownerId: string,
  kind: "source" | "poster",
) {
  const id = crypto.randomUUID(),
    job = crypto.randomUUID();
  await db.db.insert(mediaAssets).values({
    id,
    ...(owner === "series" ? { seriesId: ownerId } : { videoId: ownerId }),
    kind,
    provider: "minio",
    bucket: "vertical-movie-app-media-test",
    objectKey: `sources/${id}/original`,
    state: "uploaded",
    sizeBytes: 100n,
    contentType: kind === "source" ? "video/mp4" : "image/png",
    createdBy: actor,
  });
  await db.db.insert(mediaJobs).values({
    id: job,
    assetId: id,
    generation: 1,
    kind,
    state: "succeeded",
    outputPrefix: `outputs/${id}/${job}/${crypto.randomUUID()}/`,
    outputFiles:
      kind === "source"
        ? [
            "master.m3u8",
            "0/index.m3u8",
            "0/init_0.mp4",
            "0/segment_000000.m4s",
          ]
        : ["poster.webp"],
    finishedAt: new Date(),
  });
  await db.db
    .update(mediaAssets)
    .set({
      state: "ready",
      readyJobId: job,
      sha256: "a".repeat(64),
      facts: sql`${JSON.stringify(kind === "source" ? { durationMs: 12000, width: 1080, height: 1920 } : { width: 1080, height: 1920, codec: "webp" })}::text::jsonb`,
      verifiedReadyAt: new Date(),
    })
    .where(eq(mediaAssets.id, id));
  if (owner === "series")
    await db.db
      .update(series)
      .set({ posterAssetId: id })
      .where(eq(series.id, ownerId));
  else
    await db.db
      .update(videos)
      .set(kind === "source" ? { sourceAssetId: id } : { posterAssetId: id })
      .where(eq(videos.id, ownerId));
  return { id, job };
}
async function fixture() {
  const p = await json(
    "/admin/series",
    "POST",
    {
      title: "ASER proof",
      slug: crypto.randomUUID(),
      synopsis: "Series synopsis",
    },
    201,
  );
  const e = await json(
    "/admin/videos",
    "POST",
    {
      kind: "episode",
      title: "Episode",
      slug: crypto.randomUUID(),
      synopsis: "Episode synopsis",
      seasonId: p.defaultSeason.id,
      episodeNumber: 1,
      rightsConfirmed: true,
    },
    201,
  );
  const poster = await ready("series", p.series.id, "poster");
  const source = await ready("video", e.id, "source");
  await ready("video", e.id, "poster");
  return { p: p.series, season: p.defaultSeason, e, poster, source };
}

test("native auth and Series GET/POST parity reject every stale media/upload/metadata gate without writes", async () => {
  const f = await fixture(),
    path = `/admin/series/${f.p.id}`;
  for (const [c, status] of [
    ["", 401],
    [ordinary, 403],
  ] as const) {
    for (const [suffix, method, body] of [
      ["/publication-readiness", "GET", undefined],
      ["/publish", "POST", intent()],
    ] as const) {
      const r = await request(path + suffix, method, body, c);
      expect(r.status).toBe(status);
      expect(r.headers.get("cache-control")).toBe("private, no-store");
    }
  }
  const blocked = async (code: string, error = "PUBLICATION_NOT_READY") => {
    const r = await json(path + "/publication-readiness");
    expect(r.canPublish).toBe(false);
    expect(r.checks.find((c: { code: string }) => c.code === code).status).toBe(
      "blocked",
    );
    await failure(path + "/publish", "POST", intent(), error);
    expect((await json(path)).rowVersion).toBe(1);
    expect(
      await db.db
        .select()
        .from(contentOperations)
        .where(eq(contentOperations.seriesId, f.p.id)),
    ).toHaveLength(0);
  };
  await blocked("PUBLISHED_EPISODE");
  await db.db
    .update(videos)
    .set({ rightsConfirmedAt: null, rightsConfirmedBy: null })
    .where(eq(videos.id, f.e.id));
  expect(
    (await json(`/admin/videos/${f.e.id}/publication-readiness`)).checks.find(
      (c: { code: string }) => c.code === "RIGHTS",
    ).status,
  ).toBe("blocked");
  await failure(
    `/admin/videos/${f.e.id}/publish`,
    "POST",
    intent(),
    "PUBLICATION_NOT_READY",
  );
  await db.db
    .update(videos)
    .set({ rightsConfirmedAt: new Date(), rightsConfirmedBy: actor })
    .where(eq(videos.id, f.e.id));
  await db.db
    .update(mediaAssets)
    .set({
      facts: sql`${JSON.stringify({ durationMs: 600001, width: 1080, height: 1920 })}::text::jsonb`,
    })
    .where(eq(mediaAssets.id, f.source.id));
  expect(
    (await json(`/admin/videos/${f.e.id}/publication-readiness`)).canPublish,
  ).toBe(false);
  await failure(
    `/admin/videos/${f.e.id}/publish`,
    "POST",
    intent(),
    "PUBLICATION_NOT_READY",
  );
  await db.db
    .update(mediaAssets)
    .set({
      facts: sql`${JSON.stringify({ durationMs: 600000, width: 1080, height: 1920 })}::text::jsonb`,
    })
    .where(eq(mediaAssets.id, f.source.id));
  expect(
    (await json(`/admin/videos/${f.e.id}/publication-readiness`)).canPublish,
  ).toBe(true);
  await json(`/admin/videos/${f.e.id}/publish`, "POST", intent());
  const read = await json(path + "/publication-readiness");
  expect(read.canPublish).toBe(true);
  expect(read.checks).toHaveLength(6);
  await db.db
    .update(series)
    .set({ synopsis: null })
    .where(eq(series.id, f.p.id));
  await blocked("SYNOPSIS");
  await db.db
    .update(series)
    .set({ synopsis: "Series synopsis" })
    .where(eq(series.id, f.p.id));
  await db.db
    .update(mediaAssets)
    .set({ generation: 2 })
    .where(eq(mediaAssets.id, f.poster.id));
  await blocked("VERIFIED_POSTER");
  await db.db
    .update(mediaAssets)
    .set({ generation: 1 })
    .where(eq(mediaAssets.id, f.poster.id));
  await db.db
    .update(mediaJobs)
    .set({ state: "failed" })
    .where(eq(mediaJobs.id, f.poster.job));
  await blocked("VERIFIED_POSTER");
  await db.db
    .update(mediaJobs)
    .set({ state: "succeeded" })
    .where(eq(mediaJobs.id, f.poster.job));
  await db.db
    .update(mediaAssets)
    .set({ generation: 2 })
    .where(eq(mediaAssets.id, f.source.id));
  await blocked("PUBLISHED_EPISODE");
  await db.db
    .update(mediaAssets)
    .set({ generation: 1 })
    .where(eq(mediaAssets.id, f.source.id));
  const upload = crypto.randomUUID();
  await db.db.insert(uploadSessions).values({
    id: upload,
    assetId: f.poster.id,
    seriesId: f.p.id,
    kind: "poster",
    actorId: actor,
    idempotencyKey: crypto.randomUUID(),
    requestHash: "a".repeat(64),
    filename: "cover.png",
    stagingKey: `uploads/${upload}`,
    uploadId: "fixture",
    status: "initializing",
    sizeBytes: 100n,
    partSizeBytes: 5242880n,
    partCount: 1,
    expiresAt: new Date(Date.now() + 86400000),
  });
  for (const status of [
    "initializing",
    "pending",
    "completing",
    "aborting",
  ] as const) {
    await db.db
      .update(uploadSessions)
      .set({ status })
      .where(eq(uploadSessions.id, upload));
    await blocked("NO_ACTIVE_UPLOAD", "PUBLICATION_MEDIA_BUSY");
  }
  await db.db
    .update(uploadSessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(uploadSessions.id, upload));
  await json(path, "PATCH", {
    expectedVersion: 1,
    description: "Changed after GET",
  });
  await failure(
    path + "/publish",
    "POST",
    intent(read.rowVersion),
    "CONTENT_VERSION_CONFLICT",
  );
  const key = intent(2),
    replies = await Promise.all(
      Array.from({ length: 4 }, () => json(path + "/publish", "POST", key)),
    );
  expect(
    replies.every(
      (r) => r.rowVersion === 3 && r.publishedAt === replies[0].publishedAt,
    ),
  ).toBe(true);
  expect(
    await db.db
      .select()
      .from(contentOperations)
      .where(eq(contentOperations.seriesId, f.p.id)),
  ).toHaveLength(1);
  await failure(
    path + "/publish",
    "POST",
    { ...key, expectedVersion: 3 },
    "PUBLICATION_IDEMPOTENCY_CONFLICT",
  );
  expect((await json(path + "/publication-readiness")).canPublish).toBe(false);
  await failure(
    path + "/archive",
    "POST",
    { expectedVersion: 3 },
    "CONTENT_STATE_CONFLICT",
  );
}, 30000);

test("hierarchy, first publication locks and parent archive races preserve effective public counts/Next", async () => {
  const f = await fixture(),
    p = `/admin/series/${f.p.id}`,
    v = `/admin/videos/${f.e.id}`;
  const genre = crypto.randomUUID();
  await db.client`INSERT INTO genres (id,name,slug) VALUES (${genre}::uuid,'ASER genre',${genre})`;
  await json(p, "PATCH", { expectedVersion: 1, genreIds: [genre] });
  expect(
    (await json(v)).effectiveGenres.map((g: { id: string }) => g.id),
  ).toEqual([genre]);
  await failure(
    "/admin/videos",
    "POST",
    {
      kind: "episode",
      title: "Duplicate",
      seasonId: f.season.id,
      episodeNumber: 1,
    },
    "EPISODE_NUMBER_CONFLICT",
  );
  const s2 = await json(p + "/seasons", "POST", { seasonNumber: 2 }, 201);
  await failure(
    p + "/seasons",
    "POST",
    { seasonNumber: 2 },
    "SEASON_NUMBER_CONFLICT",
  );
  const e2 = await json(
    "/admin/videos",
    "POST",
    {
      kind: "episode",
      title: "Next",
      slug: crypto.randomUUID(),
      synopsis: "Next episode",
      seasonId: s2.id,
      episodeNumber: 1,
      rightsConfirmed: true,
    },
    201,
  );
  await ready("video", e2.id, "source");
  await ready("video", e2.id, "poster");
  for (const e of [f.e, e2])
    await json(`/admin/videos/${e.id}/publish`, "POST", intent());
  expect(
    (await request(`/videos/${f.e.slug}`, "GET", undefined, "")).status,
  ).toBe(404);
  await json(p + "/publish", "POST", intent(2));
  expect((await json(`/series/${f.p.slug}`)).playableEpisodeCount).toBe(2);
  expect((await json(`/videos/${f.e.slug}/next`)).id).toBe(e2.id);
  await failure(
    v,
    "PATCH",
    { expectedVersion: 2, episodeNumber: 9 },
    "CONTENT_STATE_CONFLICT",
  );
  await failure(
    `/admin/seasons/${f.season.id}`,
    "PATCH",
    { expectedVersion: 1, seasonNumber: 9 },
    "CONTENT_STATE_CONFLICT",
  );
  await failure(
    `/admin/seasons/${s2.id}/archive`,
    "POST",
    { expectedVersion: 1 },
    "CONTENT_STATE_CONFLICT",
  );
  await json(`/admin/videos/${e2.id}/archive`, "POST", { expectedVersion: 2 });
  expect((await json(`/series/${f.p.slug}`)).playableEpisodeCount).toBe(1);
  expect(
    (await request(`/videos/${e2.slug}`, "GET", undefined, "")).status,
  ).toBe(404);
  const s3 = await json(p + "/seasons", "POST", { seasonNumber: 3 }, 201);
  const draft = await json(
    "/admin/videos",
    "POST",
    {
      kind: "episode",
      title: "Race draft",
      synopsis: "Race",
      seasonId: s3.id,
      episodeNumber: 1,
      rightsConfirmed: true,
    },
    201,
  );
  await ready("video", draft.id, "source");
  await ready("video", draft.id, "poster");
  const races = await Promise.all([
    request(`/admin/videos/${draft.id}/publish`, "POST", intent()),
    request(`/admin/seasons/${s3.id}/archive`, "POST", { expectedVersion: 1 }),
  ]);
  expect(races.filter((r) => r.status === 200)).toHaveLength(1);
  expect(races.filter((r) => [404, 409].includes(r.status))).toHaveLength(1);
  const r = await json(`/admin/videos/${draft.id}/publication-readiness`);
  if (r.publicationStatus === "published")
    await json(`/admin/videos/${draft.id}/archive`, "POST", {
      expectedVersion: 2,
    });
  else {
    expect(
      r.checks.find((c: { code: string }) => c.code === "ACTIVE_PARENTS")
        .status,
    ).toBe("blocked");
    await failure(
      `/admin/videos/${draft.id}`,
      "PATCH",
      { expectedVersion: 1, title: "Blocked" },
      "CONTENT_ARCHIVED",
    );
  }
  await json(v + "/archive", "POST", { expectedVersion: 2 });
  expect(
    (await request(`/series/${f.p.slug}`, "GET", undefined, "")).status,
  ).toBe(404);
  expect((await json(p)).publicationStatus).toBe("published");
  expect((await json(v)).firstPublishedAt).not.toBeNull();
}, 30000);

test("Series read-only snapshot cannot reserve child eligibility across a media generation change", async () => {
  const f = await fixture();
  await json(`/admin/videos/${f.e.id}/publish`, "POST", intent());
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>((r) => {
      entered = r;
    }),
    held = new Promise<void>((r) => {
      release = r;
    });
  const original = SeriesPublicationEvidenceStore.prototype.read;
  const spy = spyOn(
    SeriesPublicationEvidenceStore.prototype,
    "read",
  ).mockImplementation(async function (
    this: SeriesPublicationEvidenceStore,
    row,
  ) {
    entered();
    await held;
    return original.call(this, row);
  });
  try {
    const read = publication.seriesReadiness(f.p.id);
    await started;
    await db.db
      .update(mediaAssets)
      .set({ generation: 2 })
      .where(eq(mediaAssets.id, f.source.id));
    release();
    const old = await read;
    spy.mockRestore();
    expect(old.canPublish).toBe(true);
    expect((await publication.seriesReadiness(f.p.id)).canPublish).toBe(false);
    await failure(
      `/admin/series/${f.p.id}/publish`,
      "POST",
      intent(old.rowVersion),
      "PUBLICATION_NOT_READY",
    );
  } finally {
    release();
    spy.mockRestore();
  }
}, 30000);
