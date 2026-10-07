import { publicCatalogFixture } from "./public-catalog-fixture";
import { publicCatalogStorageFixture } from "./public-catalog-storage-fixture";
import { createApp } from "../../src/app";
import { CatalogService } from "../../src/modules/catalog/service";
import { CatalogPosterService } from "../../src/modules/catalog/poster-service";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { SeriesService } from "../../src/modules/series/service";
import { createSeriesRepository } from "../../src/modules/series/repository";

/** Dedicated SQL editorial/ready fixtures plus actual private WebP; never a production control route. */
export async function createPublicCatalogBrowserFixture() {
  const storage = await publicCatalogStorageFixture();
  const f = await publicCatalogFixture({
    collision: true,
    bucket: storage.config.bucket,
  });
  try {
    for (const key of f.posterKeys.values()) await storage.write(key);
    const service = new CatalogService(f.legacy, undefined, f.store),
      posters = new CatalogPosterService(
        f.store,
        storage.native,
        storage.config,
      );
    const videoAdmin = new VideosService(
        createVideosRepository(f.db.db),
        undefined,
        service.invalidate,
      ),
      seriesAdmin = new SeriesService(
        createSeriesRepository(f.db.db),
        undefined,
        service.invalidate,
      );
    let authReads = 0;
    const app = createApp({
      catalogService: service,
      catalogPosterService: posters,
      getSession: async () => {
        authReads++;
        throw Error("Public catalog must not read auth");
      },
      requestLogger: { write: () => {} },
    });
    const originalVideos = await f.db
        .client`SELECT id,published_at::text at,row_version FROM videos`,
      originalSeries = await f.db
        .client`SELECT id,published_at::text at,row_version FROM series`;
    const flags = {
      catalogStatus: 0,
      genresStatus: 0,
      featuredStatus: 0,
      posterStatus: 0,
      holdNext: false,
      holdSearch: "",
    };
    const releases = new Set<() => void>();
    const traces: Array<{
      path: string;
      query: string;
      method: string;
      cookie: boolean;
      authorization: boolean;
      aborted?: boolean;
    }> = [];
    async function restore() {
      for (const row of originalVideos)
        await f.db
          .client`UPDATE videos SET publication_status='published',published_at=${row.at}::timestamptz,archived_at=null,row_version=${row.row_version} WHERE id=${row.id}::uuid`;
      for (const row of originalSeries)
        await f.db
          .client`UPDATE series SET publication_status='published',published_at=${row.at}::timestamptz,archived_at=null,row_version=${row.row_version} WHERE id=${row.id}::uuid`;
      service.invalidate();
    }
    async function control(body: Record<string, unknown>) {
      for (const key of [
        "catalogStatus",
        "genresStatus",
        "featuredStatus",
        "posterStatus",
      ] as const)
        if (typeof body[key] === "number" && [0, 422, 503].includes(body[key]))
          flags[key] = body[key];
      if (typeof body.holdNext === "boolean") flags.holdNext = body.holdNext;
      if (typeof body.holdSearch === "string")
        flags.holdSearch = body.holdSearch;
      if (!flags.holdNext && !flags.holdSearch) {
        for (const release of releases) release();
        releases.clear();
      }
      if (body.restore === true) await restore();
      if (body.empty === true) {
        await f.db
          .client`UPDATE videos SET publication_status='draft',published_at=null`;
        await f.db
          .client`UPDATE series SET publication_status='draft',published_at=null`;
        service.invalidate();
      }
      if (body.archive && typeof body.archive === "object") {
        const { kind, id } = body.archive as { kind?: string; id?: string };
        if (kind === "series" && f.seriesIds.includes(id ?? ""))
          await seriesAdmin.archive(id!, 2, "media-admin");
        else if (
          (kind === "movie" || kind === "standalone") &&
          f.videoIds.includes(id ?? "")
        )
          await videoAdmin.archive(id!, 2, "media-admin");
        else throw Error("Refusing non-fixture owner");
      }
      if (body.clearTraces === true) traces.length = 0;
    }
    async function handle(request: Request) {
      const url = new URL(request.url),
        trace = {
          path: url.pathname,
          query: url.search,
          method: request.method,
          cookie: request.headers.has("cookie"),
          authorization: request.headers.has("authorization"),
          aborted: false,
        };
      traces.push(trace);
      if (
        (flags.holdNext &&
          url.pathname === "/catalog" &&
          url.searchParams.has("cursor")) ||
        (flags.holdSearch &&
          url.searchParams.get("search") === flags.holdSearch)
      ) {
        await new Promise<void>((resolve) => {
          const release = () => {
            request.signal.removeEventListener("abort", release);
            releases.delete(release);
            resolve();
          };
          releases.add(release);
          if (request.signal.aborted) release();
          else
            request.signal.addEventListener("abort", release, { once: true });
        });
        if (request.signal.aborted) {
          trace.aborted = true;
          return new Response(null, { status: 499 });
        }
      }
      const status =
        url.pathname === "/catalog"
          ? flags.catalogStatus
          : url.pathname === "/catalog/genres"
            ? flags.genresStatus
            : url.pathname === "/catalog/featured"
              ? flags.featuredStatus
              : url.pathname.endsWith("/poster")
                ? flags.posterStatus
                : 0;
      if (status)
        return Response.json(
          {
            error: {
              code:
                status === 422
                  ? "VALIDATION_ERROR"
                  : "CONTENT_DEPENDENCY_UNAVAILABLE",
              message: "Fixture failure",
            },
          },
          { status, headers: { "cache-control": "private, no-store" } },
        );
      return app.handle(request);
    }
    return {
      handle,
      control,
      proof: () => ({
        traces,
        authReads,
        posterBytes: storage.image.length,
        ids: { videos: f.videoIds, series: f.seriesIds, genres: f.genreIds },
      }),
      close: async () => {
        for (const release of releases) release();
        await f.close();
        await storage.close();
      },
    };
  } catch (error) {
    await f.close();
    await storage.close();
    throw error;
  }
}
