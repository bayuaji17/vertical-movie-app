import { eq } from "drizzle-orm";
import { resetContentDatabase } from "./content-fixture";
import { createApp } from "../../src/app";
import type { RequireAdminDependencies } from "../../src/modules/auth/admin/guard";
import { ContentPageService } from "../../src/modules/content/service";
import { createContentPageRepository } from "../../src/modules/content/repository";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { GenresService } from "../../src/modules/genres/service";
import { createGenresRepository } from "../../src/modules/genres/repository";
import { videos, series } from "../../src/db/schema";

// This resets only the dedicated local content test database (validated by helper).
// Auth is injected; metadata routes, validation, transactions and persistence are real.
export async function createAdminContentFixture(
  getSession: RequireAdminDependencies["getSession"],
) {
  const database = await resetContentDatabase();
  await database.client`UPDATE "user" SET id='browser-admin',name='Browser Admin',email='browser@example.test' WHERE id='content-admin'`;
  const videosService = new VideosService(createVideosRepository(database.db)),
    seriesService = new SeriesService(createSeriesRepository(database.db)),
    genresService = new GenresService(createGenresRepository(database.db));
  const contentPageService = new ContentPageService(
    createContentPageRepository(database.db),
  );
  const app = createApp({
    getSession,
    videosService,
    seriesService,
    genresService,
    contentPageService,
  }).compile();
  const ids: Record<string, string> = {};
  for (let i = 0; i < 42; i++)
    await genresService.create({ name: `Genre ${String(i).padStart(2, "0")}` });
  for (const type of ["film", "standalone", "series"] as const) {
    for (let i = 0; i < 43; i++) {
      const title = `Fixture ${type} ${String(i).padStart(2, "0")}`;
      const row =
        type === "series"
          ? (await seriesService.create({ title }, "browser-admin")).series
          : await videosService.create(
              { title, kind: type === "film" ? "movie" : "standalone" },
              "browser-admin",
            );
      if (type === "series" && i === 1) {
        ids.parentSeries = row.id;
        ids.parentSeason = (await seriesService.get(row.id)).seasons[0]!.id;
      }
      if (i === 0) {
        ids[`${type}Published`] = row.id;
        const values = {
          publicationStatus: "published" as const,
          firstPublishedAt: new Date(),
          publishedAt: new Date(),
        };
        if (type === "series")
          await database.db
            .update(series)
            .set(values)
            .where(eq(series.id, row.id));
        else
          await database.db
            .update(videos)
            .set(values)
            .where(eq(videos.id, row.id));
      }
      if (i === 42) {
        ids[`${type}Archived`] = row.id;
        if (type === "series")
          await seriesService.archive(row.id, 1, "browser-admin");
        else await videosService.archive(row.id, 1, "browser-admin");
      }
    }
  }
  ids.episode = (
    await videosService.create(
      {
        kind: "episode",
        title: "Readonly episode",
        seasonId: ids.parentSeason!,
        episodeNumber: 1,
      },
      "browser-admin",
    )
  ).id;
  const traces: Array<{
    method: string;
    path: string;
    input: unknown;
    status: number;
  }> = [];
  let failureStatus = 0;
  return {
    ids,
    traces,
    control(input: { failureStatus?: number }) {
      if (input.failureStatus !== undefined)
        failureStatus = input.failureStatus;
    },
    async handle(request: Request) {
      const url = new URL(request.url);
      const mutation = request.method === "POST" || request.method === "PATCH";
      const input = mutation ? await request.clone().json() : null;
      if (
        url.pathname === "/admin/content" &&
        url.searchParams.get("search") === "Slow"
      )
        await Bun.sleep(800);
      const response =
        mutation && failureStatus
          ? Response.json(
              {
                error: {
                  code: "CONTENT_DEPENDENCY_UNAVAILABLE",
                  message: "Fixture outage",
                  requestId: crypto.randomUUID(),
                },
              },
              { status: failureStatus },
            )
          : await app.handle(request);
      if (mutation)
        traces.push({
          method: request.method,
          path: url.pathname,
          input,
          status: response.status,
        });
      return response;
    },
    close: () => database.client.close(),
  };
}
