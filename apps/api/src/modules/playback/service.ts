import {
  playbackReadiness,
  posterReadiness,
} from "../../shared/media-readiness";
import type { S3Client } from "bun";
import {
  ContentError,
  notFound,
  unavailable,
} from "../../shared/content-error";
import type { CatalogStore, PlayableRow } from "../catalog/repository";
import { rewriteManifest } from "./manifest";
export class PlaybackService {
  constructor(
    private readonly store?: CatalogStore,
    private readonly native?: S3Client,
    private readonly baseUrl?: string,
    private readonly profile?: { provider: string; bucket: string },
    private readonly now = () => new Date(),
  ) {}
  private dependencies() {
    if (!this.store || !this.native || !this.baseUrl || !this.profile)
      unavailable();
    return {
      store: this.store,
      native: this.native,
      base: this.baseUrl,
      profile: this.profile,
    };
  }
  private async row(identifier: string, preview: boolean) {
    const { store, profile } = this.dependencies(),
      row = preview
        ? await store.preview(identifier)
        : (await store.playable({ slug: identifier, limit: 1 }))[0];
    if (!row) notFound();
    return { row, ...playbackReadiness(row, profile) };
  }
  private route(row: PlayableRow, preview: boolean) {
    const { base } = this.dependencies();
    return preview
      ? base + "/admin/videos/" + row.video.id + "/hls"
      : base + "/playback/videos/" + row.video.slug;
  }
  async info(identifier: string, preview = false) {
    const { row, ttl } = await this.row(identifier, preview),
      { native } = this.dependencies();
    const poster = row.posterJob.outputPrefix + "poster.webp";
    posterReadiness(row);
    return {
      videoId: row.video.id,
      title: row.video.title,
      durationMs: Number(row.source.facts!.durationMs),
      masterUrl: this.route(row, preview) + "/master.m3u8",
      posterUrl: native.presign(poster, { expiresIn: ttl }),
      expiresAt: new Date(this.now().getTime() + ttl * 1000).toISOString(),
    };
  }
  async poster(slug: string) {
    const { row, ttl } = await this.row(slug, false);
    posterReadiness(row);
    const { native } = this.dependencies();
    return {
      videoId: row.video.id,
      posterUrl: native.presign(row.posterJob.outputPrefix + "poster.webp", {
        expiresIn: ttl,
      }),
      expiresAt: new Date(this.now().getTime() + ttl * 1000).toISOString(),
    };
  }
  async playlist(
    identifier: string,
    index: string | undefined,
    preview = false,
  ) {
    const { row, ttl } = await this.row(identifier, preview),
      { native } = this.dependencies();
    if (index !== undefined && !/^[0-2]$/.test(index)) notFound();
    const file = index === undefined ? "master.m3u8" : index + "/index.m3u8";
    if (!row.hls.outputFiles?.includes(file)) notFound();
    const key = row.hls.outputPrefix! + file;
    if ((await native.stat(key)).size > 2097152)
      throw new ContentError(
        "PLAYBACK_MANIFEST_TOO_LARGE",
        "Playback manifest is unavailable.",
        503,
      );
    const text = await native.file(key).text();
    const body = rewriteManifest(
      text,
      file,
      row.hls.outputFiles,
      (i) => this.route(row, preview) + "/variants/" + i,
      (relative) =>
        native.presign(row.hls.outputPrefix! + relative, { expiresIn: ttl }),
    );
    return new Response(body, {
      headers: {
        "content-type": "application/vnd.apple.mpegurl",
        "cache-control": "private, no-store",
      },
    });
  }
}
