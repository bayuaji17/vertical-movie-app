import type { videos } from "../../db/schema";
import {
  notFound,
  unavailable,
  ContentError,
  invalid,
} from "../../shared/content-error";
import {
  cleanMetadata,
  validateRelease,
  slugFor,
  editable,
  requireChanges,
  archiveState,
  defaultRuntime,
  type RuntimeDependencies,
} from "../../shared/content-metadata";
import type {
  CreateVideoInput,
  VideoListInput,
  PatchVideoInput,
} from "./model";
import { parseList, page } from "../../shared/content-pagination";
import type { VideosStore, VideosRepository } from "./repository";
type VideoRow = typeof videos.$inferSelect;
export async function videoDto(row: VideoRow, store: VideosStore) {
  return {
    id: row.id,
    kind: row.kind,
    seasonId: row.seasonId,
    episodeNumber: row.episodeNumber,
    slug: row.slug,
    title: row.title,
    originalTitle: row.originalTitle,
    synopsis: row.synopsis,
    description: row.description,
    originalLanguage: row.originalLanguage,
    releaseYear: row.releaseYear,
    releaseDate: row.releaseDate,
    rightsConfirmedAt: row.rightsConfirmedAt?.toISOString() ?? null,
    publicationStatus: row.publicationStatus,
    firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    rowVersion: row.rowVersion,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    genreIds: await store.genreIds(row.id),
  };
}
export class VideosService {
  async archive(id: string, version: number, actor: string) {
    const repo = this.repo(),
      initial = await repo.store.get(id);
    if (!initial) notFound();
    return repo.transact(async (store) => {
      if (initial.seasonId) {
        const [parent] = await store.parents([initial.seasonId], true);
        if (!parent) notFound();
        editable(parent.parent);
        editable(parent.season);
      }
      const old = await store.get(id, true);
      if (!old) notFound();
      if (old.seasonId !== initial.seasonId)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Grouping has changed.",
        );
      if (archiveState(old, version)) return videoDto(old, store);
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
      return videoDto(row, store);
    });
  }
  async update(id: string, input: PatchVideoInput, actor: string) {
    requireChanges(input);
    const repo = this.repo(),
      initial = await repo.store.get(id);
    if (!initial) notFound();
    return repo.transact(async (store) => {
      const parentIds = [initial.seasonId, input.seasonId].filter(
        (v): v is string => typeof v === "string",
      );
      const parents = await store.parents(parentIds, true);
      if (parents.length !== new Set(parentIds).size) notFound();
      for (const parent of parents) {
        editable(parent.parent);
        editable(parent.season);
      }
      const old = await store.get(id, true);
      if (!old) notFound();
      editable(old, input.expectedVersion);
      if (old.seasonId !== initial.seasonId)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Grouping has changed.",
        );
      if (
        old.kind !== "episode" &&
        (input.seasonId !== undefined || input.episodeNumber !== undefined)
      )
        invalid("Only episodes have season and episode numbers.");
      if (
        old.firstPublishedAt &&
        ((input.seasonId !== undefined && input.seasonId !== old.seasonId) ||
          (input.episodeNumber !== undefined &&
            input.episodeNumber !== old.episodeNumber) ||
          (input.slug !== undefined && input.slug !== old.slug))
      )
        throw new ContentError(
          "CONTENT_STATE_CONFLICT",
          "Grouping and slug cannot change after first publication.",
        );
      if (
        old.publicationStatus === "published" &&
        input.rightsConfirmed === false
      )
        throw new ContentError(
          "CONTENT_STATE_CONFLICT",
          "Unpublish before revoking rights confirmation.",
        );
      const { expectedVersion, genreIds, rightsConfirmed, ...values } =
        cleanMetadata(input);
      validateRelease(
        values.releaseYear === undefined ? old.releaseYear : values.releaseYear,
        values.releaseDate === undefined ? old.releaseDate : values.releaseDate,
      );
      const now = this.runtime.now();
      const row = await store.update(id, expectedVersion, {
        ...values,
        ...(rightsConfirmed !== undefined
          ? {
              rightsConfirmedAt: rightsConfirmed ? now : null,
              rightsConfirmedBy: rightsConfirmed ? actor : null,
            }
          : {}),
        updatedBy: actor,
        updatedAt: now,
        rowVersion: expectedVersion + 1,
      });
      if (!row)
        throw new ContentError(
          "CONTENT_VERSION_CONFLICT",
          "Content has changed.",
        );
      if (genreIds !== undefined) await store.setGenres(id, genreIds);
      return videoDto(row, store);
    });
  }
  private async detail(row: VideoRow, store: VideosStore) {
    const parent = row.seasonId
      ? (await store.parents([row.seasonId]))[0]
      : undefined;
    const own = await store.ownGenres(row.id),
      effective = own.length
        ? own
        : parent
          ? await store.inheritedGenres(parent.parent.id)
          : [];
    return {
      ...(await videoDto(row, store)),
      series: parent
        ? {
            id: parent.parent.id,
            title: parent.parent.title,
            slug: parent.parent.slug,
          }
        : null,
      season: parent
        ? {
            id: parent.season.id,
            seasonNumber: parent.season.seasonNumber,
            title: parent.season.title,
          }
        : null,
      effectiveGenres: effective.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
      })),
    };
  }
  async get(id: string) {
    const store = this.repo().store,
      row = await store.get(id);
    if (!row) notFound();
    return this.detail(row, store);
  }
  async list(input: VideoListInput) {
    const query = parseList(input, "videos", {
        kind: input.kind,
        seriesId: input.seriesId,
        seasonId: input.seasonId,
      }),
      store = this.repo().store,
      result = page(await store.list(query, input), query);
    return {
      items: await Promise.all(
        result.items.map((row) => this.detail(row, store)),
      ),
      nextCursor: result.nextCursor,
    };
  }
  constructor(
    private readonly repository?: VideosRepository,
    private readonly runtime: RuntimeDependencies = defaultRuntime,
  ) {}
  private repo() {
    return this.repository ?? unavailable();
  }
  async create(input: CreateVideoInput, actor: string) {
    const { genreIds = [], rightsConfirmed, ...values } = cleanMetadata(input);
    validateRelease(values.releaseYear, values.releaseDate);
    return this.repo().transact(async (store) => {
      if (input.kind === "episode") {
        const [parent] = await store.parents([input.seasonId], true);
        if (!parent) notFound();
        editable(parent.parent);
        editable(parent.season);
      }
      const id = this.runtime.id(),
        now = this.runtime.now();
      const row = await store.insert({
        ...values,
        id,
        slug: slugFor(values.title, id, values.slug),
        rightsConfirmedAt: rightsConfirmed ? now : null,
        rightsConfirmedBy: rightsConfirmed ? actor : null,
        createdBy: actor,
        updatedBy: actor,
        createdAt: now,
        updatedAt: now,
      });
      await store.setGenres(id, genreIds);
      return videoDto(row, store);
    });
  }
}
