import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publicCatalogFixture } from "./public-catalog-fixture";
import { publicCatalogStorageFixture } from "./public-catalog-storage-fixture";
import { CatalogService } from "../../src/modules/catalog/service";
import { PublicContentStore } from "../../src/modules/catalog/content-repository";
import { CatalogPosterService } from "../../src/modules/catalog/poster-service";
import { PlaybackService } from "../../src/modules/playback/service";
import { VideosService } from "../../src/modules/videos/service";
import { createVideosRepository } from "../../src/modules/videos/repository";
import { createApp } from "../../src/app";
import { runMediaProcess } from "../../src/workers/process";
import { transcodeHls } from "../../src/workers/transcode";
import { probe, videoFacts } from "../../src/workers/probe";

/** Guarded test DB, owned private bucket, production HLS encoder; controls never join the runtime app. */
export async function createPublicContentBrowserFixture(
  options: { videoCount?: number } = {},
) {
  const storage = await publicCatalogStorageFixture(),
    extraKeys = new Set<string>();
  const f = await publicCatalogFixture({
    videoCount: options.videoCount ?? 7,
    seriesCount: 1,
    bucket: storage.config.bucket,
  });
  const directory = await mkdtemp(join(tmpdir(), "public-content-hls-"));
  try {
    if (options.videoCount)
      await f.db
        .client`UPDATE videos SET title=${"A very long portrait film title with a story that keeps its words readable on the smallest screen 🎬"}, synopsis=${"A complete portrait synopsis. ".repeat(16)} WHERE id=${f.videoIds[0]}::uuid`;
    const season2 = crypto.randomUUID();
    await f.db
      .client`INSERT INTO seasons(id,series_id,season_number,created_by,updated_by) VALUES (${season2}::uuid,${f.seriesIds[0]}::uuid,2,'media-admin','media-admin')`;
    for (let n = 2; n <= 24; n++)
      f.episodeIds.push(
        await f.createEpisode(
          n,
          n <= 12 ? f.seasonIds[0]! : season2,
          n <= 12 ? n : n - 12,
        ),
      );
    const source = join(directory, "source.mp4"),
      hls = join(directory, "hls");
    await runMediaProcess(
      [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=0x205b78:s=1080x1920:r=24",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000",
        "-t",
        "12",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-threads",
        "1",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        source,
      ],
      { timeoutSeconds: 120 },
    );
    const facts = videoFacts(
        await probe(source),
        "movie",
        "source.mp4",
        Bun.file(source).size,
      ),
      output = await transcodeHls(source, hls, facts);
    for (const key of f.posterKeys.values()) await storage.write(key);
    const sources = await f.db
      .client`SELECT a.id, j.id job_id,j.output_prefix FROM media_assets a JOIN media_jobs j ON j.id=a.ready_job_id WHERE a.kind='source'`;
    const encoded = await Promise.all(
      output.files.map(async (file) => ({
        file,
        bytes: await Bun.file(join(hls, file)).arrayBuffer(),
      })),
    );
    for (const row of sources) {
      const writes = await Promise.allSettled(
        encoded.map(async ({ file, bytes }) => {
          const key = row.output_prefix + file;
          if (
            !/^outputs\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\//.test(key)
          )
            throw Error("Refusing foreign output");
          extraKeys.add(key);
          await storage.native.write(key, bytes, {
            type: file.endsWith(".m3u8")
              ? "application/vnd.apple.mpegurl"
              : file.endsWith(".mp4")
                ? "video/mp4"
                : "video/iso.segment",
          });
        }),
      );
      if (writes.some((result) => result.status === "rejected"))
        throw Error("Owned fixture HLS write failed");
      await f.db
        .client`UPDATE media_assets SET facts=${JSON.stringify(facts)}::text::jsonb WHERE id=${row.id}::uuid`;
      await f.db
        .client`UPDATE media_jobs SET output_files=${JSON.stringify(output.files)}::text::jsonb WHERE id=${row.job_id}::uuid`;
    }
    const content = new PublicContentStore(f.db.db, f.store),
      service = new CatalogService(f.legacy, undefined, f.store, content);
    const admin = new VideosService(
      createVideosRepository(f.db.db),
      undefined,
      service.invalidate,
    );
    let app: ReturnType<typeof createApp> | undefined,
      authReads = 0;
    const traces: Array<{
      path: string;
      hasCursor: boolean;
      cookie: boolean;
      authorization: boolean;
      aborted: boolean;
    }> = [];
    const flags = {
      metadataStatus: 0,
      posterStatus: 0,
      episodesStatus: 0,
      nextStatus: 0,
      playbackStatus: 0,
      holdMore: false,
      holdPlayback: false,
    };
    const releases = new Set<() => void>();
    const snapshot = await f.db
      .client`SELECT id,row_version,published_at::text at FROM videos`;
    const episodes = await f.db
      .client`SELECT v.id,v.slug,v.title,s.season_number season,v.episode_number episode FROM videos v JOIN seasons s ON s.id=v.season_id ORDER BY s.season_number,v.episode_number`;
    function setWebOrigin(origin: string) {
      if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw Error("Loopback web origin required");
      app = createApp({
        catalogService: service,
        catalogPosterService: new CatalogPosterService(
          f.store,
          storage.native,
          storage.config,
        ),
        playbackService: new PlaybackService(
          f.legacy,
          storage.native,
          origin + "/api",
          storage.config,
        ),
        getSession: async () => {
          authReads++;
          throw Error("Public content must not read auth");
        },
        requestLogger: { write: () => {} },
      });
    }
    async function control(body: Record<string, unknown>) {
      for (const key of [
        "metadataStatus",
        "posterStatus",
        "episodesStatus",
        "nextStatus",
        "playbackStatus",
      ] as const)
        if (typeof body[key] === "number" && [0, 422, 503].includes(body[key]))
          flags[key] = body[key];
      for (const key of ["holdMore", "holdPlayback"] as const)
        if (typeof body[key] === "boolean") flags[key] = body[key];
      if (!flags.holdMore && !flags.holdPlayback) {
        for (const release of releases) release();
        releases.clear();
      }
      if (body.clearTraces) traces.length = 0;
      if (typeof body.archive === "string") {
        const row = snapshot.find(
          (x: { id: string; row_version: number }) => x.id === body.archive,
        );
        if (!row) throw Error("Refusing non-fixture archive");
        await admin.archive(row.id, row.row_version, "media-admin");
      }
      if (body.archiveFilms) {
        await f.db
          .client`UPDATE videos SET publication_status='archived',published_at=null,archived_at=now() WHERE kind='movie'`;
        service.invalidate();
      }
      if (body.restore) {
        for (const row of snapshot)
          await f.db
            .client`UPDATE videos SET publication_status='published',published_at=${row.at}::timestamptz,archived_at=null,row_version=${row.row_version} WHERE id=${row.id}::uuid`;
        service.invalidate();
      }
    }
    async function handle(request: Request) {
      const url = new URL(request.url),
        trace = {
          path: url.pathname,
          hasCursor: url.searchParams.has("cursor"),
          cookie: request.headers.has("cookie"),
          authorization: request.headers.has("authorization"),
          aborted: false,
        };
      traces.push(trace);
      if (
        (flags.holdMore &&
          (url.pathname.endsWith("/episodes") || url.pathname === "/videos") &&
          trace.hasCursor) ||
        (flags.holdPlayback && url.pathname.endsWith("/playback"))
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
      const status = url.pathname.endsWith("/poster")
        ? flags.posterStatus
        : url.pathname.endsWith("/episodes")
          ? flags.episodesStatus
          : url.pathname.endsWith("/next")
            ? flags.nextStatus
            : url.pathname.endsWith("/playback")
              ? flags.playbackStatus
              : /^\/catalog\/(details|watch)\//.test(url.pathname) ||
                  /^\/videos(?:\/[^/]+)?$/.test(url.pathname)
                ? flags.metadataStatus
                : 0;
      if (status)
        return Response.json(
          {
            error: {
              code: "CONTENT_DEPENDENCY_UNAVAILABLE",
              message: "Fixture failure",
            },
          },
          { status, headers: { "cache-control": "private, no-store" } },
        );
      if (!app) throw Error("Public origin must be set before reads");
      return app.handle(request);
    }
    return {
      setWebOrigin,
      handle,
      control,
      proof: () => ({
        authReads,
        traces,
        bucket: storage.config.bucket,
        hlsFiles: output.files.length,
        durationMs: facts.durationMs,
        movie: "movie-" + f.videoIds[0],
        standalone: "standalone-" + f.videoIds[6],
        series: "series-" + f.seriesIds[0],
        episodes,
      }),
      close: async () => {
        for (const release of releases) release();
        await f.close();
        for (const key of extraKeys) await storage.native.delete(key);
        await storage.close();
      },
    };
  } catch (error) {
    await f.close();
    for (const key of extraKeys) await storage.native.delete(key);
    await storage.close();
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
