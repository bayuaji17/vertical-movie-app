import type { series, seasons } from "../../db/schema";
import {
  ContentError,
  notFound,
  unavailable,
} from "../../shared/content-error";
import {
  cleanMetadata,
  cleanText,
  validateRelease,
  slugFor,
  editable,
  requireChanges,
  defaultRuntime,
  type RuntimeDependencies,
} from "../../shared/content-metadata";
import {
  parseList,
  page,
  type ListInput,
} from "../../shared/content-pagination";
import type { CreateSeriesInput, PatchSeriesInput } from "./model";
import type { SeriesRepository, SeriesStore } from "./repository";
type SeriesRow = typeof series.$inferSelect;
export function seasonDto(row: typeof seasons.$inferSelect) {
  return {
    id: row.id,
    seriesId: row.seriesId,
    seasonNumber: row.seasonNumber,
    title: row.title,
    description: row.description,
    releaseYear: row.releaseYear,
    releaseDate: row.releaseDate,
    rowVersion: row.rowVersion,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export async function seriesDto(row: SeriesRow, store: SeriesStore) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.originalTitle,
    synopsis: row.synopsis,
    description: row.description,
    originalLanguage: row.originalLanguage,
    releaseYear: row.releaseYear,
    releaseDate: row.releaseDate,
    completionStatus: row.completionStatus,
    publicationStatus: row.publicationStatus,
    firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    rowVersion: row.rowVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    genreIds: await store.genreIds(row.id),
  };
}
export class SeriesService {
  constructor(
    private readonly repository?: SeriesRepository,
    private readonly runtime: RuntimeDependencies = defaultRuntime,
  ) {}
  private repo() {
    return this.repository ?? unavailable();
  }
  async create(input: CreateSeriesInput, actor: string) {
    const normalized = cleanMetadata(input),
      id = this.runtime.id(),
      now = this.runtime.now();
    const { genreIds = [], ...values } = normalized;
    validateRelease(values.releaseYear, values.releaseDate);
    return this.repo().transact(async (store) => {
      const row = await store.insert({
        ...values,
        id,
        slug: slugFor(values.title, id, values.slug),
        createdBy: actor,
        updatedBy: actor,
        createdAt: now,
        updatedAt: now,
      });
      const season = await store.insertSeason({
        id: this.runtime.id(),
        seriesId: id,
        seasonNumber: 1,
        createdBy: actor,
        updatedBy: actor,
        createdAt: now,
        updatedAt: now,
      });
      await store.setGenres(id, genreIds);
      return {
        series: await seriesDto(row, store),
        defaultSeason: seasonDto(season),
      };
    });
  }
  async get(id: string) {
    const store = this.repo().store,
      row = await store.get(id);
    if (!row) notFound();
    return {
      ...(await seriesDto(row, store)),
      seasons: (await store.listSeasons(id)).map(seasonDto),
    };
  }
  async list(input: ListInput) {
    const query = parseList(input, "series"),
      store = this.repo().store;
    const result = page(await store.list(query), query);
    return {
      items: await Promise.all(
        result.items.map((row) => seriesDto(row, store)),
      ),
      nextCursor: result.nextCursor,
    };
  }
  async update(id: string, input: PatchSeriesInput, actor: string) {
    requireChanges(input);
    const { expectedVersion, genreIds, ...values } = cleanMetadata(input);
    return this.repo().transact(async (store) => {
      const old = await store.get(id, true);
      if (!old) notFound();
      editable(old, expectedVersion);
      validateRelease(
        values.releaseYear === undefined ? old.releaseYear : values.releaseYear,
        values.releaseDate === undefined ? old.releaseDate : values.releaseDate,
      );
      if (
        values.slug !== undefined &&
        values.slug !== old.slug &&
        old.firstPublishedAt
      )
        throw new ContentError(
          "CONTENT_STATE_CONFLICT",
          "Slug cannot change after first publication.",
        );
      if (values.title !== undefined) cleanText(values.title, true);
      const row = await store.update(id, expectedVersion, {
        ...values,
        updatedBy: actor,
        updatedAt: this.runtime.now(),
        rowVersion: expectedVersion + 1,
      });
      if (!row)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Content has changed.",
        );
      if (genreIds !== undefined) await store.setGenres(id, genreIds);
      return seriesDto(row, store);
    });
  }
}
