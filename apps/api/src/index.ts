import { CatalogService } from "./modules/catalog/service";
import { CatalogStore } from "./modules/catalog/repository";
import { CatalogHomeStore } from "./modules/catalog/home-repository";
import { PublicationService } from "./modules/publication/service";
import { PlaybackService } from "./modules/playback/service";
import { loadPlaybackBaseUrl } from "./config/playback-env";
import { createMultipartStorage } from "./storage/multipart";
import { createMediaRepository } from "./modules/media/repository";
import { MediaService } from "./modules/media/service";
import { PosterProcessingService } from "./modules/media/poster-processing";
import { loadApiEnv } from "./config/env";
import { createStorageClient } from "./storage/s3";
import { createApp } from "./app";
import { ContentPageService } from "./modules/content/service";
import { createContentPageRepository } from "./modules/content/repository";
import { createDatabase } from "./db/client";
import { SeriesService } from "./modules/series/service";
import { createSeriesRepository } from "./modules/series/repository";
import { VideosService } from "./modules/videos/service";
import { createVideosRepository } from "./modules/videos/repository";
import { GenresService } from "./modules/genres/service";
import { createGenresRepository } from "./modules/genres/repository";
import {
  createAdminAuthServer,
  generateAuthOpenAPISchema,
} from "@repo/auth/server";

const env = loadApiEnv();
const storage = env.storage ? createStorageClient(env.storage) : undefined;
const database = createDatabase(env.databaseUrl);
const catalogStore = new CatalogStore(database.db),
  catalogService = new CatalogService(
    catalogStore,
    undefined,
    new CatalogHomeStore(database.db),
  );
const multipart = env.storage ? createMultipartStorage(env.storage) : undefined;
const auth = createAdminAuthServer({
  database: database.db,
  origin: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  secureCookies: env.betterAuthUrl.startsWith("https://"),
});
const authOpenApiSchema = await generateAuthOpenAPISchema(auth);
const app = createApp({
  contentPageService: new ContentPageService(
    createContentPageRepository(database.db),
  ),
  storage,
  catalogService,
  publicationService: new PublicationService(
    database.db,
    catalogService.invalidate,
  ),
  playbackService:
    env.storage && storage
      ? new PlaybackService(
          catalogStore,
          storage,
          loadPlaybackBaseUrl(Bun.env.MEDIA_PLAYBACK_BASE_URL, env.webOrigin),
          env.storage,
        )
      : undefined,
  mediaService:
    env.storage && storage && multipart
      ? new MediaService(
          createMediaRepository(database.db),
          multipart,
          env.storage,
          undefined,
          new PosterProcessingService(
            createMediaRepository(database.db),
            multipart,
            storage,
            env.storage,
            env.poster,
          ),
        )
      : undefined,
  database,
  auth,
  authOpenApiSchema,
  secureCookies: env.betterAuthUrl.startsWith("https://"),
  getSession: (options) => auth.api.getSession(options),
  seriesService: new SeriesService(
    createSeriesRepository(database.db),
    undefined,
    catalogService.invalidate,
  ),
  videosService: new VideosService(
    createVideosRepository(database.db),
    undefined,
    catalogService.invalidate,
  ),
  genresService: new GenresService(
    createGenresRepository(database.db),
    undefined,
    catalogService.invalidate,
  ),
})
  .onStop(() => multipart?.close())
  .listen(env.port);

let isShuttingDown = false;
const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  void app.stop().catch(() => {
    console.error("API shutdown did not complete cleanly.");
    process.exitCode = 1;
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
