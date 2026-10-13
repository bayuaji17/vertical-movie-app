import { createLogger, type Logger } from "@repo/log";
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
  archiveState,
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
  async archive(id: string, version: number, actor: string) {
    return this.repo()
      .transact(async (store) => {
        const old = await store.get(id, true);
        if (!old) notFound();
        if (archiveState(old, version)) return seriesDto(old, store);
        if (await store.hasPublishedChild(id))
          throw new ContentError(
            "CONTENT_STATE_CONFLICT",
            "Unpublish child episodes before archiving.",
          );
        const now = this.runtime.now(),
          row = await store.update(id, version, {
            archivedAt: now,
            updatedAt: now,
            updatedBy: actor,
            rowVersion: version + 1,
          });
        if (!row)
          throw new ContentError(
            "CONTENT_VERSION_CONFLICT",
            "Content has changed.",
          );
        return seriesDto(row, store);
      })
      .then((dto) => {
        this.invalidate();
        return dto;
      });
  }
  /** Permanently delete a season and its episodes; a season with published episodes in a published series must be archived first. */
  async removeSeason(id: string, expectedVersion: number, actor: string) {
    const repo = this.repo(),
      initial = await repo.store.getSeason(id);
    if (!initial) notFound();
    const result = await repo.transact(async (store) => {
      const parent = await store.get(initial.seriesId, true);
      if (!parent) notFound();
      const season = await store.getSeason(id, true);
      if (!season) notFound();
      if (season.rowVersion !== expectedVersion)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Content has changed; reload before deleting.",
        );
      if (
        !season.archivedAt &&
        parent.publicationStatus === "published" &&
        (await store.seasonHasPublished(id))
      )
        throw new ContentError(
          "CONTENT_STATE_CONFLICT",
          "This season has published episodes. Archive them first.",
        );
      const videoIds = await store.episodeIds([id], true);
      const removed = await store.purge({
        videoIds,
        seasonIds: [id],
        seriesIds: [],
      });
      return { season, parent, removed };
    });
    this.invalidate();
    this.log.info("content.deleted", {
      kind: "season",
      id,
      seriesId: result.parent.id,
      seasonNumber: result.season.seasonNumber,
      archived: result.season.archivedAt !== null,
      actor,
      removed: result.removed,
    });
    return { id, kind: "season" as const, removed: result.removed };
  }
  /** Permanently delete a draft or archived series with its seasons, episodes and assets. */
  async remove(id: string, expectedVersion: number, actor: string) {
    const repo = this.repo();
    if (!(await repo.store.get(id))) notFound();
    const result = await repo.transact(async (store) => {
      const row = await store.get(id, true);
      if (!row) notFound();
      if (row.rowVersion !== expectedVersion)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Content has changed; reload before deleting.",
        );
      if (row.publicationStatus === "published")
        throw new ContentError(
          "CONTENT_STATE_CONFLICT",
          "Published content cannot be deleted. Archive it first.",
        );
      const seasonIds = await store.seasonIds(id, true);
      const videoIds = await store.episodeIds(seasonIds, true);
      const removed = await store.purge({
        videoIds,
        seasonIds,
        seriesIds: [id],
      });
      return { row, removed };
    });
    this.invalidate();
    this.log.info("content.deleted", {
      kind: "series",
      id,
      slug: result.row.slug,
      title: result.row.title,
      status: result.row.publicationStatus,
      archived: result.row.archivedAt !== null,
      everPublished: result.row.firstPublishedAt !== null,
      actor,
      removed: result.removed,
    });
    return { id, kind: "series" as const, removed: result.removed };
  }
  async archiveSeason(id: string, version: number, actor: string) {
    const repo = this.repo(),
      initial = await repo.store.getSeason(id);
    if (!initial) notFound();
    return repo
      .transact(async (store) => {
        const parent = await store.get(initial.seriesId, true);
        if (!parent) notFound();
        editable(parent);
        const old = await store.getSeason(id, true);
        if (!old) notFound();
        if (archiveState(old, version)) return seasonDto(old);
        if (await store.seasonHasPublished(id))
          throw new ContentError(
            "CONTENT_STATE_CONFLICT",
            "Unpublish child episodes before archiving.",
          );
        const now = this.runtime.now(),
          row = await store.updateSeason(id, version, {
            archivedAt: now,
            updatedAt: now,
            updatedBy: actor,
            rowVersion: version + 1,
          });
        if (!row)
          throw new ContentError(
            "CONTENT_VERSION_CONFLICT",
            "Content has changed.",
          );
        return seasonDto(row);
      })
      .then((dto) => {
        this.invalidate();
        return dto;
      });
  }
  constructor(
    private readonly repository?: SeriesRepository,
    private readonly runtime: RuntimeDependencies = defaultRuntime,
    private readonly invalidate: () => void = () => {},
    private readonly log: Logger = createLogger("api"),
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
    return this.repo()
      .transact(async (store) => {
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
      })
      .then((dto) => {
        this.invalidate();
        return dto;
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
    return repo
      .transact(async (store) => {
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
          ...(input.title !== undefined
            ? { title: cleanText(input.title) }
            : {}),
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
      })
      .then((dto) => {
        this.invalidate();
        return dto;
      });
  }
  async create(input: CreateSeriesInput, actor: string) {
    const normalized = cleanMetadata(input),
      id = this.runtime.id(),
      now = this.runtime.now();
    const { genreIds = [], ...values } = normalized;
    validateRelease(values.releaseYear, values.releaseDate);
    return this.repo()
      .transact(async (store) => {
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
      })
      .then((dto) => {
        this.invalidate();
        return dto;
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
    return this.repo()
      .transact(async (store) => {
        const old = await store.get(id, true);
        if (!old) notFound();
        editable(old, expectedVersion);
        validateRelease(
          values.releaseYear === undefined
            ? old.releaseYear
            : values.releaseYear,
          values.releaseDate === undefined
            ? old.releaseDate
            : values.releaseDate,
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
      })
      .then((dto) => {
        this.invalidate();
        return dto;
      });
  }
}
