import { createHash } from "node:crypto";
import type { S3Client } from "bun";
import {
  ContentError,
  notFound,
  unavailable,
} from "../../shared/content-error";
import { readWebpObject } from "../catalog/poster-service";
import type { CoverStore } from "./cover-repository";
import type { ContentPageInput } from "./model";

// 9:16 like the stored cover, small enough for a list row at 2x density.
export const thumbnailWidth = 90;
export const thumbnailHeight = 160;
const thumbnailQuality = 70;
const maxSourcePixels = 4_194_304;
const cacheControl = "private, max-age=300";

export type ThumbnailRuntime = (source: Uint8Array) => Promise<Uint8Array>;
const nativeThumbnail: ThumbnailRuntime = (source) =>
  new Bun.Image(source, { maxPixels: maxSourcePixels, autoOrient: true })
    .resize(thumbnailWidth, thumbnailHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: thumbnailQuality })
    .bytes();

/** The version of a cover: it changes whenever the stored object does. */
export const coverVersion = (key: string) =>
  createHash("sha256").update(key).digest("hex").slice(0, 16);

// At most `limit` resizes run at once; the rest wait their turn.
function limiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async <T>(work: () => Promise<T>) => {
    if (active >= limit) await new Promise<void>((go) => queue.push(go));
    active += 1;
    try {
      return await work();
    } finally {
      active -= 1;
      queue.shift()?.();
    }
  };
}

type Entry = { bytes: Uint8Array<ArrayBuffer> };
/**
 * Small cover thumbnails for the admin list. The full cover is read from
 * storage once, resized, and kept in a bounded cache keyed by the (immutable)
 * object key; browsers revalidate with the ETag, which costs no storage read.
 */
export class AdminCoverService {
  private readonly cache = new Map<string, Entry>();
  private cached = 0;
  private readonly run = limiter(2);
  constructor(
    private readonly store?: CoverStore,
    private readonly storage?: Pick<S3Client, "stat" | "file">,
    private readonly profile?: { provider: string; bucket: string },
    private readonly options: {
      thumbnail?: ThumbnailRuntime;
      maxEntries?: number;
      maxBytes?: number;
    } = {},
  ) {}
  async get(
    type: ContentPageInput["type"],
    id: string,
    ifNoneMatch: string | null,
    signal?: AbortSignal,
  ) {
    if (!this.store || !this.storage || !this.profile) unavailable();
    const row = await this.store.cover(type, id);
    if (!row) notFound();
    if (
      row.provider !== this.profile.provider ||
      row.bucket !== this.profile.bucket
    )
      unavailable();
    const etag = `"${coverVersion(row.key)}"`;
    const headers = {
      etag,
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff",
    };
    if (matches(ifNoneMatch, etag))
      return new Response(null, { status: 304, headers });
    const bytes = await this.thumbnail(row.key, signal);
    return new Response(bytes, {
      headers: {
        ...headers,
        "content-type": "image/webp",
        "content-length": String(bytes.byteLength),
      },
    });
  }
  private async thumbnail(key: string, signal?: AbortSignal) {
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key); // most recently used goes last
      this.cache.set(key, hit);
      return hit.bytes;
    }
    const source = await readWebpObject(this.storage!, key, signal);
    const make = this.options.thumbnail ?? nativeThumbnail;
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      // Copied into a plain ArrayBuffer so it is a valid Response body.
      bytes = new Uint8Array(
        await this.run(() => withTimeout(make(source), 10_000)),
      );
    } catch (error) {
      if (error instanceof ContentError) throw error;
      unavailable();
    }
    if (bytes.byteLength === 0) unavailable();
    this.remember(key, bytes);
    return bytes;
  }
  private remember(key: string, bytes: Uint8Array<ArrayBuffer>) {
    const maxEntries = this.options.maxEntries ?? 512,
      maxBytes = this.options.maxBytes ?? 4_000_000;
    this.cache.set(key, { bytes });
    this.cached += bytes.byteLength;
    for (const [oldest, entry] of this.cache) {
      if (this.cache.size <= maxEntries && this.cached <= maxBytes) break;
      if (oldest === key) continue;
      this.cache.delete(oldest);
      this.cached -= entry.bytes.byteLength;
    }
  }
}
// `If-None-Match` may hold several tags, weak ones, or `*`.
function matches(header: string | null, etag: string) {
  if (!header) return false;
  return header
    .split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""))
    .some((tag) => tag === etag || tag === "*");
}

async function withTimeout<T>(work: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
