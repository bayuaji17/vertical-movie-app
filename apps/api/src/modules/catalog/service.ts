import { notFound, unavailable } from "../../shared/content-error";
import { parseList, page } from "../../shared/content-pagination";
import type { CatalogStore, PlayableRow } from "./repository";
import type { PublicVideo } from "./model";
import type { HomeStore } from "./home-repository";
import { parseHome, type HomeInput } from "./home-pagination";
import type { PublicHomeItem } from "./home-model";
import type { PublicContentReader } from "./content-repository";
import { parseEpisodes } from "./content-pagination";
import type { HomeKind } from "./home-pagination";
export class CatalogService {
  private readonly cache = new Map<string, { until: number; value: unknown }>();
  private generation = 0;
  constructor(
    private readonly store?: CatalogStore,
    private readonly now = () => Date.now(),
    private readonly homeStore?: HomeStore,
    private readonly contentStore?: PublicContentReader,
  ) {}
  invalidate = () => {
    this.generation++;
    this.cache.clear();
  };
  private repository() {
    return this.store ?? unavailable();
  }
  private async entry<T>(key: string, read: () => Promise<T>) {
    const entry = this.cache.get(key);
    if (entry && entry.until > this.now())
      return { value: entry.value as T, until: entry.until };
    const generation = this.generation,
      until = this.now() + 60000;
    const value = await read();
    if (generation !== this.generation) return { value, until: this.now() };
    if (this.cache.size >= 100) this.cache.clear();
    this.cache.set(key, { until, value });
    return { value, until };
  }
  private async cached<T>(key: string, read: () => Promise<T>): Promise<T> {
    return (await this.entry(key, read)).value;
  }
  private freshness(until: number) {
    return Math.max(0, Math.min(60000, Math.floor(until - this.now())));
  }
  async detail(kind: HomeKind, slug: string) {
    const entry = await this.entry(
      `content:detail:${kind}:${slug}`,
      async () => {
        const item = await (this.contentStore ?? unavailable()).detail(
          kind,
          slug,
          new Date(this.now()),
        );
        if (!item) notFound();
        return item;
      },
    );
    return { item: entry.value, freshForMs: this.freshness(entry.until) };
  }
  async watchMetadata(slug: string) {
    const entry = await this.entry(`content:watch:${slug}`, async () => {
      const item = await (this.contentStore ?? unavailable()).watch(
        slug,
        new Date(this.now()),
      );
      if (!item) notFound();
      return item;
    });
    return { item: entry.value, freshForMs: this.freshness(entry.until) };
  }
  async episodes(slug: string, input: { limit?: string; cursor?: string }) {
    const query = parseEpisodes(slug, input, new Date(this.now()));
    const entry = await this.entry(
      `content:episodes:${query.filter}:${input.cursor ?? ""}`,
      () => (this.contentStore ?? unavailable()).episodes(query),
    );
    return { ...entry.value, freshForMs: this.freshness(entry.until) };
  }
  async home(input: HomeInput) {
    const q = parseHome(input, new Date(this.now()));
    const entry = await this.entry(
      "home:" + q.filter + ":" + (input.cursor ?? ""),
      () => (this.homeStore ?? unavailable()).page(q),
    );
    return { ...entry.value, freshForMs: this.freshness(entry.until) };
  }
  async genres(input: Pick<HomeInput, "limit" | "cursor">) {
    const q = parseHome(input, new Date(this.now()), "catalog-genres");
    const entry = await this.entry(
      "home-genres:" + q.filter + ":" + (input.cursor ?? ""),
      () => (this.homeStore ?? unavailable()).genres(q),
    );
    return { ...entry.value, freshForMs: this.freshness(entry.until) };
  }
  async featured() {
    const entry = await this.entry("home-featured", async () => {
      const page = await (this.homeStore ?? unavailable()).page(
        parseHome({ limit: "1", kind: "movie" }, new Date(this.now())),
      );
      const item = page.items[0];
      if (item && item.kind !== "movie") unavailable();
      return {
        item: item as Extract<PublicHomeItem, { kind: "movie" }> | undefined,
      };
    });
    return {
      item: entry.value.item ?? null,
      freshForMs: this.freshness(entry.until),
    };
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
