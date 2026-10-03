import type { videos } from "../../db/schema";
import { notFound, unavailable } from "../../shared/content-error";
import {
  cleanMetadata,
  validateRelease,
  slugFor,
  editable,
  defaultRuntime,
  type RuntimeDependencies,
} from "../../shared/content-metadata";
import type { CreateVideoInput } from "./model";
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
