import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createAdminAuthServer } from "@repo/auth/server";
import { resetMediaDatabase } from "./media-fixture";
import { attachMedia, counts } from "./content-delete-fixture";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";

// Browser proof harness for deleting draft/archived content.
//   seed   <origin> <state.json>  reset the dedicated DB + private bucket, create an admin and sample content
//   status <state.json>           print row counts and the objects still in the bucket
//   clean  <state.json>           empty and remove the private bucket
// Only vertical_movie_app_media_test (guarded by resetMediaDatabase) and a random
// vertical-movie-app-media-test-* bucket are touched.
export const adminEmail = "delete-browser@example.test";
export const adminPassword = "delete-browser-proof-2026";
const endpoint = Bun.env.MEDIA_STORAGE_TEST_ENDPOINT;
if (
  endpoint !== "http://localhost:9000" &&
  endpoint !== "http://127.0.0.1:9000"
)
  throw new Error("Loopback MinIO required.");
const sdk = new S3Client({
  endpoint,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: Bun.env.MEDIA_STORAGE_TEST_ACCESS_KEY_ID!,
    secretAccessKey: Bun.env.MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY!,
  },
});
async function keys(bucket: string) {
  const out: string[] = [];
  let token: string | undefined;
  do {
    const page = await sdk.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    out.push(...(page.Contents ?? []).map((o) => o.Key!));
    token = page.NextContinuationToken;
  } while (token);
  return out.sort();
}
const put = (
  bucket: string,
  key: string,
  body: string | Uint8Array = "proof",
) => sdk.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
// A real 1080x1920 WebP, so the admin thumbnail endpoint has something to resize.
let coverBytes: Promise<Uint8Array> | undefined;
const cover = () =>
  (coverBytes ??= Bun.file(
    new URL("../fixtures/media/browser-cover-crop.png", import.meta.url),
  )
    .bytes()
    .then((png) =>
      new Bun.Image(png)
        .resize(1080, 1920, { fit: "fill" })
        .webp({ quality: 80 })
        .bytes(),
    ));

async function seed(origin: string, file: string) {
  const bucket =
    "vertical-movie-app-media-test-" + crypto.randomUUID().slice(0, 8);
  await sdk.send(new CreateBucketCommand({ Bucket: bucket }));
  const database = await resetMediaDatabase();
  const { client, db } = database;
  await client`DELETE FROM "user" WHERE id='media-admin'`;
  const auth = createAdminAuthServer({
    database: db,
    origin,
    secret: Bun.env.BETTER_AUTH_SECRET!,
    secureCookies: false,
  });
  const admin = await auth.api.createUser({
    body: {
      email: adminEmail,
      name: "Delete Browser Admin",
      password: adminPassword,
      role: "admin",
    },
  });
  const actor = admin.user.id;
  const videos = new VideosService(
    createVideosRepository(db),
    undefined,
    () => {},
  );
  const series = new SeriesService(
    createSeriesRepository(db),
    undefined,
    () => {},
  );
  const media = async (
    owner: { videoId?: string; seriesId?: string },
    kind: "source" | "poster" = "source",
    jobState: "succeeded" | "running" = "succeeded",
  ) => {
    const m = await attachMedia(
      client,
      owner,
      kind,
      jobState,
      jobState === "running" ? "pending" : "completed",
      bucket,
      actor,
    );
    // Verified facts make a succeeded asset count for the readiness predicate.
    await client`UPDATE media_assets SET facts='{"durationMs":600000}'::jsonb WHERE id=${m.assetId}::uuid`;
    await put(bucket, `sources/${m.assetId}/original`);
    await put(bucket, `uploads/${m.sessionId}/original`);
    await put(bucket, `outputs/${m.assetId}/${m.jobId}/x/0/index.m3u8`);
    await put(bucket, `outputs/${m.assetId}/${m.jobId}/x/0/seg0.ts`);
    if (kind === "poster") {
      const [job] =
        await client`SELECT output_prefix FROM media_jobs WHERE id=${m.jobId}::uuid`;
      await put(bucket, `${job.output_prefix}poster.webp`, await cover());
    }
    return m;
  };
  const movie = async (title: string, patch = "") => {
    const v = await videos.create({ kind: "movie", title }, actor);
    if (patch) await client.unsafe(patch.replaceAll("$id", v.id));
    return v;
  };
  const draft = await movie("Browser Draft Film");
  await media({ videoId: draft.id });
  const mobile = await movie("Browser Mobile Film");
  await media({ videoId: mobile.id });
  await media({ videoId: mobile.id }, "poster"); // video + cover: ready to publish
  const live = await movie(
    "Browser Live Film",
    "UPDATE videos SET publication_status='published',published_at=now(),first_published_at=now() WHERE id='$id'::uuid",
  );
  const busy = await movie("Browser Busy Film");
  await media({ videoId: busy.id }, "source", "running");
  const archived = await videos.create(
    { kind: "standalone", title: "Browser Archived Short" },
    actor,
  );
  await media({ videoId: archived.id });
  await client`UPDATE videos SET publication_status='archived',archived_at=now(),published_at=NULL,first_published_at=now() WHERE id=${archived.id}::uuid`;
  const show = await series.create({ title: "Browser Draft Series" }, actor);
  const season2 = await series.createSeason(
    show.series.id,
    { seasonNumber: 2 },
    actor,
  );
  await media({ seriesId: show.series.id }, "poster");
  const episodes: string[] = [];
  for (const [seasonId, n] of [
    [show.defaultSeason.id, 1],
    [show.defaultSeason.id, 2],
    [season2.id, 1],
  ] as const) {
    const e = await videos.create(
      {
        kind: "episode",
        title: `Browser Episode ${episodes.length + 1}`,
        seasonId,
        episodeNumber: n,
      },
      actor,
    );
    await media({ videoId: e.id });
    episodes.push(e.id);
  }
  // Genres and a year, so the list has something to summarise.
  const genreIds = {
    drama: crypto.randomUUID(),
    scifi: crypto.randomUUID(),
    comedy: crypto.randomUUID(),
  };
  await client`INSERT INTO genres (id,slug,name) VALUES (${genreIds.drama}::uuid,'drama','Drama'),(${genreIds.scifi}::uuid,'sci-fi','Sci-Fi'),(${genreIds.comedy}::uuid,'comedy','Comedy')`;
  for (const g of Object.values(genreIds))
    await client`INSERT INTO video_genres (video_id,genre_id) VALUES (${draft.id}::uuid,${g}::uuid)`;
  await client`INSERT INTO series_genres (series_id,genre_id) VALUES (${show.series.id}::uuid,${genreIds.drama}::uuid)`;
  await client`UPDATE videos SET release_year=2024 WHERE id=${draft.id}::uuid`;
  await client`UPDATE series SET release_year=2021 WHERE id=${show.series.id}::uuid`;
  const state = {
    bucket,
    admin: { email: adminEmail, password: adminPassword },
    ids: {
      draft: draft.id,
      mobile: mobile.id,
      live: live.id,
      busy: busy.id,
      archived: archived.id,
      series: show.series.id,
      season1: show.defaultSeason.id,
      season2: season2.id,
      episodes,
    },
    seeded: await counts(client),
    objects: (await keys(bucket)).length,
  };
  await Bun.write(file, JSON.stringify(state, null, 2));
  await client.close();
  console.log(
    JSON.stringify({ bucket, seeded: state.seeded, objects: state.objects }),
  );
}
async function status(file: string) {
  const state = await Bun.file(file).json();
  const { createDatabase } = await import("../../src/db/client");
  const { mediaTestUrl } = await import("./media-fixture");
  const database = createDatabase(mediaTestUrl());
  const [pending] =
    await database.client`SELECT count(*)::int n FROM media_storage_tombstones WHERE deleted_at IS NULL`;
  const [done] =
    await database.client`SELECT count(*)::int n FROM media_storage_tombstones WHERE deleted_at IS NOT NULL`;
  const left = await keys(state.bucket);
  console.log(
    JSON.stringify({
      counts: await counts(database.client),
      tombstones: { pending: pending.n, swept: done.n },
      objects: left.length,
      keys: process.argv.includes("--keys") ? left : undefined,
    }),
  );
  await database.client.close();
}
async function clean(file: string) {
  const state = await Bun.file(file).json();
  const left = await keys(state.bucket);
  if (left.length)
    await sdk.send(
      new DeleteObjectsCommand({
        Bucket: state.bucket,
        Delete: { Objects: left.map((Key) => ({ Key })) },
      }),
    );
  await sdk.send(new DeleteBucketCommand({ Bucket: state.bucket }));
  console.log("bucket removed");
}
const [mode, a, b] = Bun.argv.slice(2);
if (mode === "seed") await seed(a!, b!);
else if (mode === "status") await status(a!);
else if (mode === "clean") await clean(a!);
else
  throw new Error(
    "usage: seed <origin> <state> | status <state> | clean <state>",
  );
