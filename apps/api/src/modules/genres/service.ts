import type { genres } from "../../db/schema";
import { unavailable, invalid } from "../../shared/content-error";
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
import type { CreateGenreInput } from "./model";
import type { GenresRepository } from "./repository";
export function genreDto(row: typeof genres.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export class GenresService {
  constructor(
    private readonly repository?: GenresRepository,
    private readonly runtime: RuntimeDependencies = defaultRuntime,
  ) {}
  private repo() {
    return this.repository ?? unavailable();
  }
  async create(input: CreateGenreInput) {
    const name = cleanText(input.name, true) ?? invalid("Name is required."),
      id = this.runtime.id(),
      now = this.runtime.now();
    return genreDto(
      await this.repo().insert({
        id,
        name,
        slug: slugFor(name, id, input.slug, 80),
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
  async list(input: ListInput) {
    const q = parseList(input, "genres"),
      result = page(await this.repo().list(q), q);
    return { items: result.items.map(genreDto), nextCursor: result.nextCursor };
  }
}
