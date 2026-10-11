// Sample catalog metadata for local development: genres, films, standalone
// videos and series with seasons and episodes. Everything is created as a
// draft with no media and no rights confirmation, so nothing is public until an
// admin uploads media, confirms rights and publishes it.
//
//   bun run --cwd apps/api db:seed:sample              create what is missing
//   bun run --cwd apps/api db:seed:sample -- --dry-run list what would be created
//   bun run --cwd apps/api db:seed:sample -- --remove  delete untouched sample drafts (genres stay)
//
// It goes through the same services as the admin API, so slugs, versions and
// genre links follow the normal rules. Existing slugs are skipped, never edited.
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { loadDatabaseUrl } from "../config/env";
import { createDatabase } from "./client";
import {
  genres,
  seasons,
  series,
  seriesGenres,
  user,
  videoGenres,
  videos,
} from "./schema";
import { GenresService } from "../modules/genres/service";
import { createGenresRepository } from "../modules/genres/repository";
import { SeriesService } from "../modules/series/service";
import { createSeriesRepository } from "../modules/series/repository";
import { VideosService } from "../modules/videos/service";
import { createVideosRepository } from "../modules/videos/repository";
import {
  allVideoSlugs,
  films,
  genreNames,
  shows,
  standalones,
} from "./sample-content-data";

const args = new Set(Bun.argv.slice(2));
const dry = args.has("--dry-run");
const remove = args.has("--remove");
const { client, db } = createDatabase(loadDatabaseUrl());

async function actorId() {
  const [row] = await db.select({ id: user.id }).from(user).limit(1);
  if (!row)
    throw new Error(
      "No user exists. Create the admin first (bun run --cwd apps/api admin:provision), then run the seed again.",
    );
  return row.id;
}
async function seed() {
  const actor = await actorId();
  const genreService = new GenresService(createGenresRepository(db));
  const videoService = new VideosService(createVideosRepository(db));
  const seriesService = new SeriesService(createSeriesRepository(db));
  const counts = { genres: 0, films: 0, standalone: 0, series: 0, episodes: 0 };
  const skipped: string[] = [];

  const existingGenres = await db.select().from(genres);
  const genreId = new Map(
    existingGenres.map((g) => [g.name.toLowerCase(), g.id]),
  );
  for (const name of genreNames) {
    if (genreId.has(name.toLowerCase())) continue;
    counts.genres++;
    if (dry) {
      genreId.set(name.toLowerCase(), "dry-run");
      continue;
    }
    const created = await genreService.create({ name });
    genreId.set(name.toLowerCase(), created.id);
  }
  const ids = (names: string[]) =>
    names.flatMap((n) => genreId.get(n.toLowerCase()) ?? []);

  const takenVideos = new Set(
    (
      await db
        .select({ slug: videos.slug })
        .from(videos)
        .where(inArray(videos.slug, allVideoSlugs))
    ).map((r) => r.slug),
  );
  const takenSeries = new Set(
    (
      await db
        .select({ slug: series.slug })
        .from(series)
        .where(
          inArray(
            series.slug,
            shows.map((s) => s.slug),
          ),
        )
    ).map((r) => r.slug),
  );
  const base = { originalLanguage: "id" } as const;
  for (const [kind, list] of [
    ["movie", films],
    ["standalone", standalones],
  ] as const)
    for (const item of list) {
      if (takenVideos.has(item.slug)) {
        skipped.push(item.slug);
        continue;
      }
      counts[kind === "movie" ? "films" : "standalone"]++;
      if (dry) continue;
      await videoService.create(
        {
          ...base,
          kind,
          title: item.title,
          slug: item.slug,
          synopsis: item.synopsis,
          releaseYear: item.year,
          genreIds: ids(item.genres),
        },
        actor,
      );
    }
  for (const show of shows) {
    if (takenSeries.has(show.slug)) {
      skipped.push(show.slug);
      continue;
    }
    counts.series++;
    const total = show.seasons.flat().length;
    counts.episodes += total;
    if (dry) continue;
    const created = await seriesService.create(
      {
        ...base,
        title: show.title,
        slug: show.slug,
        synopsis: show.synopsis,
        releaseYear: show.year,
        genreIds: ids(show.genres),
        completionStatus: "ongoing",
      },
      actor,
    );
    for (const [index, episodes] of show.seasons.entries()) {
      const seasonNumber = index + 1;
      const seasonId =
        seasonNumber === 1
          ? created.defaultSeason.id
          : (
              await seriesService.createSeason(
                created.series.id,
                { seasonNumber, releaseYear: show.year },
                actor,
              )
            ).id;
      for (const [n, episode] of episodes.entries())
        await videoService.create(
          {
            ...base,
            kind: "episode",
            seasonId,
            episodeNumber: n + 1,
            title: episode.title,
            slug: `${show.slug}-s${seasonNumber}e${n + 1}`,
            synopsis: episode.synopsis,
            releaseYear: show.year,
          },
          actor,
        );
    }
  }
  const nothing = Object.values(counts).every((n) => n === 0);
  console.log(
    dry
      ? "Dry run, nothing written."
      : nothing
        ? "Nothing to create: all sample content already exists."
        : "Sample content created.",
  );
  console.table(counts);
  if (skipped.length)
    console.log(`Skipped (slug already exists): ${skipped.join(", ")}`);
  if (!dry && !nothing)
    console.log(
      "All items are drafts without media. Upload media in the admin, confirm rights and publish.",
    );
}
async function removeSamples() {
  const untouched = and(
    inArray(videos.slug, allVideoSlugs),
    eq(videos.publicationStatus, "draft"),
    isNull(videos.sourceAssetId),
  );
  const mine = await db.select({ id: videos.id }).from(videos).where(untouched);
  const ids = mine.map((r) => r.id);
  const kept = allVideoSlugs.length - ids.length;
  if (dry) {
    console.log(`Would delete ${ids.length} untouched sample videos.`);
    return;
  }
  if (ids.length) {
    await db.delete(videoGenres).where(inArray(videoGenres.videoId, ids));
    await db.delete(videos).where(inArray(videos.id, ids));
  }
  let removedSeries = 0;
  for (const show of shows) {
    const [row] = await db
      .select({ id: series.id })
      .from(series)
      .where(eq(series.slug, show.slug));
    if (!row) continue;
    const [left] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(videos)
      .innerJoin(seasons, eq(videos.seasonId, seasons.id))
      .where(eq(seasons.seriesId, row.id));
    if (left && left.n > 0) continue;
    await db.delete(seriesGenres).where(eq(seriesGenres.seriesId, row.id));
    await db.delete(seasons).where(eq(seasons.seriesId, row.id));
    await db.delete(series).where(eq(series.id, row.id));
    removedSeries++;
  }
  console.log(
    `Removed ${ids.length} videos and ${removedSeries} series. Kept ${kept} sample slugs that are missing, published or have media. Genres are left in place; delete unused ones in the admin.`,
  );
}
try {
  if (remove) await removeSamples();
  else await seed();
} finally {
  await client.close();
}
