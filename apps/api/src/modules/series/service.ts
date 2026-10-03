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
import type {
  CreateSeriesInput,
  PatchSeriesInput,
  CreateSeasonInput,
  PatchSeasonInput,
} from "./model";
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
  async createSeason(
    seriesId: string,
    input: CreateSeasonInput,
    actor: string,
  ) {
    validateRelease(input.releaseYear, input.releaseDate);
    return this.repo().transact(async (store) => {
      const parent = await store.get(seriesId, true);
      if (!parent) notFound();
      editable(parent);
      const now = this.runtime.now();
      const row = await store.insertSeason({
        ...input,
        title: cleanText(input.title),
        description: cleanText(input.description),
        id: this.runtime.id(),
        seriesId,
        createdBy: actor,
        updatedBy: actor,
        createdAt: now,
        updatedAt: now,
      });
      return seasonDto(row);
    });
  }
  async listSeasons(seriesId: string, includeArchived = false) {
    const store = this.repo().store;
    if (!(await store.get(seriesId))) notFound();
    return {
      items: (await store.listSeasons(seriesId, includeArchived)).map(
        seasonDto,
      ),
    };
  }
  async updateSeason(id: string, input: PatchSeasonInput, actor: string) {
    requireChanges(input);
    const repo = this.repo(),
      initial = await repo.store.getSeason(id);
    if (!initial) notFound();
    return repo.transact(async (store) => {
      const parent = await store.get(initial.seriesId, true);
      if (!parent) notFound();
      editable(parent);
      const old = await store.getSeason(id, true);
      if (!old) notFound();
      editable(old, input.expectedVersion);
      validateRelease(
        input.releaseYear === undefined ? old.releaseYear : input.releaseYear,
        input.releaseDate === undefined ? old.releaseDate : input.releaseDate,
      );
      if (
        input.seasonNumber !== undefined &&
        input.seasonNumber !== old.seasonNumber &&
        (await store.seasonHasPublished(id, true))
      )
        throw new ContentError(
          "CONTENT_STATE_CONFLICT",
          "Season number cannot change after an episode has been published.",
        );
      const { expectedVersion, ...values } = input;
      const row = await store.updateSeason(id, expectedVersion, {
        ...values,
        ...(input.title !== undefined ? { title: cleanText(input.title) } : {}),
        ...(input.description !== undefined
          ? { description: cleanText(input.description) }
          : {}),
        updatedAt: this.runtime.now(),
        updatedBy: actor,
        rowVersion: expectedVersion + 1,
      });
      if (!row)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Content has changed.",
        );
      return seasonDto(row);
    });
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
