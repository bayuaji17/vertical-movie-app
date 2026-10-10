import {
  ContentError,
  invalid,
  notFound,
  unavailable,
} from "../../shared/content-error";
import { databaseErrorCode } from "../../shared/content-error";
import {
  cleanText,
  slugFor,
  defaultRuntime,
  type RuntimeDependencies,
} from "../../shared/content-metadata";
import {
  parseList,
  page,
  type ListInput,
} from "../../shared/content-pagination";
import type { CreateGenreInput, UpdateGenreInput } from "./model";
import type { GenreRow, GenresRepository } from "./repository";
export function genreDto(row: GenreRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    usageCount: row.usageCount,
  };
}
const referenceViolations = new Set(["23001", "23503"]);
export class GenresService {
  constructor(
    private readonly repository?: GenresRepository,
    private readonly runtime: RuntimeDependencies = defaultRuntime,
    private readonly invalidate = () => {},
  ) {}
  private repo() {
    return this.repository ?? unavailable();
  }
  async create(input: CreateGenreInput) {
    const name = cleanText(input.name, true) ?? invalid("Name is required."),
      id = this.runtime.id(),
      now = this.runtime.now();
    const result = genreDto(
      await this.repo().insert({
        id,
        name,
        slug: slugFor(name, id, input.slug, 80),
        createdAt: now,
        updatedAt: now,
      }),
    );
    this.invalidate();
    return result;
  }
  async list(input: ListInput) {
    const q = parseList(input, "genres"),
      result = page(await this.repo().list(q), q);
    return { items: result.items.map(genreDto), nextCursor: result.nextCursor };
  }
  async update(id: string, input: UpdateGenreInput) {
    const repo = this.repo();
    if (input.name === undefined && input.slug === undefined)
      invalid("Provide a name or slug to change.");
    if (Number.isNaN(Date.parse(input.expectedUpdatedAt)))
      invalid("expectedUpdatedAt must be a timestamp.");
    const values: { name?: string; slug?: string; updatedAt: Date } = {
      updatedAt: this.runtime.now(),
    };
    if (input.name !== undefined)
      values.name = cleanText(input.name, true) ?? invalid("Name is required.");
    if (input.slug !== undefined) values.slug = slugFor("", id, input.slug, 80);
    const changed = await repo.update(id, input.expectedUpdatedAt, values);
    if (!changed) {
      // Either the genre is gone or someone saved after the admin read it.
      if (!(await repo.find(id))) notFound();
      throw new ContentError(
        "GENRE_VERSION_CONFLICT",
        "The genre changed after it was loaded.",
      );
    }
    const row = (await repo.find(id)) ?? notFound();
    this.invalidate();
    return genreDto(row);
  }
  async remove(id: string) {
    try {
      if (!(await this.repo().remove(id))) notFound();
    } catch (error) {
      // RESTRICT reports 23001 (restrict_violation); NO ACTION would report
      // 23503. Either way content still references the genre.
      if (referenceViolations.has(databaseErrorCode(error) ?? ""))
        throw new ContentError(
          "GENRE_IN_USE",
          "The genre is still used by content.",
        );
      throw error;
    }
    this.invalidate();
    return { id };
  }
}
