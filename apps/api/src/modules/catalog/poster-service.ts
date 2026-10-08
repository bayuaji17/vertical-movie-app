import type { S3Client } from "bun";
import {
  ContentError,
  notFound,
  unavailable,
} from "../../shared/content-error";
import type { HomeStore } from "./home-repository";
import type { HomeKind } from "./home-pagination";

export const publicPosterMaxBytes = 5_000_000;
export class CatalogPosterService {
  constructor(
    private readonly store?: HomeStore,
    private readonly storage?: Pick<S3Client, "stat" | "file">,
    private readonly profile?: { provider: string; bucket: string },
  ) {}
  async get(kind: HomeKind, id: string, signal?: AbortSignal) {
    if (!this.store || !this.storage || !this.profile) unavailable();
    const row = await this.store.poster(kind, id);
    if (!row) notFound();
    if (
      row.provider !== this.profile.provider ||
      row.bucket !== this.profile.bucket
    )
      unavailable();
    const abort = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const cancel = () => {
      void reader?.cancel().catch(() => undefined);
    };
    try {
      abort.throwIfAborted();
      const stat = await this.storage.stat(row.key);
      abort.throwIfAborted();
      if (stat.size < 12 || stat.size > publicPosterMaxBytes) unavailable();
      reader = this.storage.file(row.key).stream().getReader();
      abort.addEventListener("abort", cancel, { once: true });
      const parts: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const part = await reader.read();
        abort.throwIfAborted();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > publicPosterMaxBytes) {
          await reader.cancel();
          unavailable();
        }
        parts.push(part.value);
      }
      if (size !== stat.size) unavailable();
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      const magic = new TextDecoder("ascii");
      if (
        magic.decode(bytes.subarray(0, 4)) !== "RIFF" ||
        magic.decode(bytes.subarray(8, 12)) !== "WEBP" ||
        new DataView(bytes.buffer).getUint32(4, true) + 8 !== size
      )
        unavailable();
      // A hide/reprocess during storage I/O must not deliver the previous output.
      const current = await this.store.poster(kind, id);
      if (!current) notFound();
      if (
        current.key !== row.key ||
        current.provider !== row.provider ||
        current.bucket !== row.bucket
      )
        unavailable();
      return new Response(bytes, {
        headers: {
          "content-type": "image/webp",
          "content-length": String(size),
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      });
    } catch (error) {
      if (error instanceof ContentError) throw error;
      unavailable();
    } finally {
      abort.removeEventListener("abort", cancel);
      reader?.releaseLock();
    }
  }
}
