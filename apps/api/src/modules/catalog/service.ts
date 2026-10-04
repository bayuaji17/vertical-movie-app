import { notFound, unavailable } from "../../shared/content-error";
import { parseList, page } from "../../shared/content-pagination";
import type { CatalogStore, PlayableRow } from "./repository";
import type { PublicVideo } from "./model";
export class CatalogService {
  private readonly cache = new Map<string, { until: number; value: unknown }>();
  constructor(
    private readonly store?: CatalogStore,
    private readonly now = () => Date.now(),
  ) {}
  invalidate = () => {
    this.cache.clear();
  };
  private repository() {
    return this.store ?? unavailable();
  }
  private async cached<T>(key: string, read: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);
    if (entry && entry.until > this.now()) return entry.value as T;
    const value = await read();
    if (this.cache.size >= 100) this.cache.clear();
    this.cache.set(key, { until: this.now() + 60000, value });
    return value;
  }
  private video(row: PlayableRow): PublicVideo {
    return {
      id: row.video.id,
      slug: row.video.slug,
      title: row.video.title,
      synopsis: row.video.synopsis!,
      kind: row.video.kind,
      durationMs: Number(row.source.facts!.durationMs),
      seasonNumber: row.season?.seasonNumber ?? null,
      episodeNumber: row.video.episodeNumber,
      seriesSlug: row.parent?.slug ?? null,
    };
  }
  async list(query: { limit?: string; cursor?: string }) {
    const q = parseList(query, "public-videos");
    return this.cached("videos:" + JSON.stringify(query), async () => {
      const rows = await this.repository().playable({
          limit: q.limit + 1,
          cursor: q.cursor
            ? { at: new Date(q.cursor.createdAt), id: q.cursor.id }
            : undefined,
        }),
        result = page(
          rows.map((row) => ({
            id: row.video.id,
            createdAt: row.video.createdAt,
            row,
          })),
          q,
        );
      return {
        items: result.items.map((r) => this.video(r.row)),
        nextCursor: result.nextCursor,
      };
    });
  }
  async get(slug: string) {
    return this.cached("video:" + slug, async () => {
      const [row] = await this.repository().playable({ slug, limit: 1 });
      if (!row) notFound();
      return this.video(row);
    });
  }
  async series() {
    return this.cached("series", async () => {
      const result = [];
      for (const parent of await this.repository().seriesList()) {
        const count = await this.repository().seriesCount(parent.id);
        if (count && parent.synopsis?.trim())
          result.push({
            id: parent.id,
            slug: parent.slug,
            title: parent.title,
            synopsis: parent.synopsis,
            playableEpisodeCount: count,
          });
      }
      return { items: result };
    });
  }
  async seriesDetail(slug: string) {
    const list = await this.series(),
      parent = list.items.find((p) => p.slug === slug);
    if (!parent) notFound();
    return parent;
  }
  async next(slug: string) {
    const [current] = await this.repository().playable({ slug, limit: 1 });
    if (
      !current ||
      !current.parent ||
      !current.season ||
      !current.video.episodeNumber
    )
      notFound();
    const next = await this.repository().next(
      current.parent.id,
      current.season.seasonNumber,
      current.video.episodeNumber,
    );
    if (!next) notFound();
    return this.video(next);
  }
}
