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
    if (
      row.source.provider !== profile.provider ||
      row.source.bucket !== profile.bucket ||
      row.poster.provider !== profile.provider ||
      row.poster.bucket !== profile.bucket
    )
      throw new ContentError(
        "PLAYBACK_PROFILE_CONFLICT",
        "Playback storage profile is unavailable.",
        503,
      );
    if (
      !row.hls.outputPrefix ||
      !new RegExp(
        "^outputs/" + row.source.id + "/" + row.hls.id + "/[a-f0-9-]{36}/$",
      ).test(row.hls.outputPrefix)
    )
      throw new ContentError(
        "PLAYBACK_INVALID_OUTPUT",
        "Playback output identity is invalid.",
        503,
      );
    const duration = Number(row.source.facts?.durationMs);
    if (!Number.isSafeInteger(duration) || duration < 1 || duration > 1800000)
      throw new ContentError(
        "PLAYBACK_INVALID_DURATION",
        "Playback duration is unavailable.",
        503,
      );
    return { row, ttl: Math.ceil((duration * 2) / 1000) };
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
    if (
      !row.posterJob.outputFiles?.includes("poster.webp") ||
      !row.posterJob.outputPrefix?.startsWith(
        "outputs/" + row.poster.id + "/" + row.posterJob.id + "/",
      )
    )
      throw new ContentError(
        "PLAYBACK_INVALID_POSTER",
        "Poster is unavailable.",
        503,
      );
    return {
      videoId: row.video.id,
      title: row.video.title,
      durationMs: Number(row.source.facts!.durationMs),
      masterUrl: this.route(row, preview) + "/master.m3u8",
      posterUrl: native.presign(poster, { expiresIn: ttl }),
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
