import { GenresService } from "../../src/modules/genres/service";
import { createGenresRepository } from "../../src/modules/genres/repository";
import { resetContentDatabase } from "./content-fixture";
import { seedDashboard } from "./admin-dashboard-fixture";
import { createApp } from "../../src/app";
import { DashboardService } from "../../src/modules/dashboard/service";
import { createDashboardRepository } from "../../src/modules/dashboard/repository";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";
import { ContentPageService } from "../../src/modules/content/service";
import { createContentPageRepository } from "../../src/modules/content/repository";
import type { RequireAdminDependencies } from "../../src/modules/auth/admin/guard";
export async function createAdminDashboardFixture(
  getSession: RequireAdminDependencies["getSession"],
) {
  const database = await resetContentDatabase();
  await database.client`UPDATE "user" SET id='browser-admin',name='Browser Admin',email='browser@example.test' WHERE id='content-admin'`;
  const ids = await seedDashboard(database, "browser-admin");
  await database.client`UPDATE media_jobs j SET updated_at='2026-10-08T00:00:01Z' FROM media_assets a WHERE a.id=j.asset_id AND a.video_id=${ids.episodes[3]!}`;
  const app = createApp({
    getSession,
    genresService: new GenresService(createGenresRepository(database.db)),
    dashboardService: new DashboardService(
      createDashboardRepository(database.db),
    ),
    videosService: new VideosService(createVideosRepository(database.db)),
    seriesService: new SeriesService(createSeriesRepository(database.db)),
    contentPageService: new ContentPageService(
      createContentPageRepository(database.db),
    ),
  }).compile();
  let failure = 0,
    held = false,
    mode = "normal",
    reads = 0;
  const releases = new Set<() => void>();
  return {
    ids: {
      episode: ids.episodes[3],
      series: ids.parents[0],
      film: ids.films[0],
    },
    proof: () => ({ reads }),
    async control(input: {
      failure?: number;
      held?: boolean;
      mode?: string;
      longTitle?: boolean;
      advanceJob?: boolean;
      publishFilm?: boolean;
    }) {
      if (input.advanceJob)
        await database.client`UPDATE media_jobs j SET state='failed',updated_at=now() FROM media_assets a WHERE a.id=j.asset_id AND a.video_id=${ids.films[0]!} AND a.kind='source'`;
      if (input.publishFilm)
        await database.client`UPDATE videos SET publication_status='published',published_at=now(),first_published_at=now() WHERE id=${ids.films[0]!}`;
      if (input.failure !== undefined) failure = input.failure;
      if (input.mode) mode = input.mode;
      if (input.held !== undefined) {
        held = input.held;
        if (!held) {
          for (const release of releases) release();
          releases.clear();
        }
      }
      if (input.longTitle)
        await database.client`UPDATE videos SET title=${"Long title " + "W".repeat(180)} WHERE id=${ids.latest[0]!}`;
    },
    async handle(request: Request) {
      if (new URL(request.url).pathname !== "/admin/dashboard/summary")
        return app.handle(request);
      reads++;
      const response = await app.handle(request);
      if (response.status !== 200) return response;
      const snapshot = await response.json();
      if (held) await new Promise<void>((resolve) => releases.add(resolve));
      if (failure)
        return Response.json(
          {
            error: {
              code: "CONTENT_DEPENDENCY_UNAVAILABLE",
              message: "Fixture unavailable",
              requestId: crypto.randomUUID(),
            },
          },
          {
            status: failure,
            headers: { "cache-control": "private, no-store" },
          },
        );
      if (mode === "empty") {
        for (const value of Object.values(snapshot.content))
          for (const key of Object.keys(value as object))
            (value as Record<string, number>)[key] = 0;
        for (const key of Object.keys(snapshot.media)) snapshot.media[key] = 0;
        snapshot.latestContent = [];
        snapshot.failedMedia = [];
      }
      if (mode === "large") {
        snapshot.content.film.draft =
          Number.MAX_SAFE_INTEGER -
          snapshot.content.film.published -
          snapshot.content.film.archived;
        snapshot.content.film.total = Number.MAX_SAFE_INTEGER;
        snapshot.media.failed = Number.MAX_SAFE_INTEGER;
      }
      if (mode === "invalid") snapshot.privateUnexpected = "must-not-cache";
      return Response.json(snapshot, {
        headers: { "cache-control": "private, no-store" },
      });
    },
    async close() {
      for (const release of releases) release();
      await database.client.close();
    },
  };
}
