import { invalid, unavailable } from "../../shared/content-error";
import type { ContentPageInput } from "./model";
import type { ContentPageRepository } from "./repository";

export class ContentPageService {
  constructor(private readonly repository?: ContentPageRepository) {}
  list(query: ContentPageInput) {
    const { includeArchived, ...input } = query;
    const page = Number(input.page ?? 1),
      pageSize = Number(input.pageSize ?? 10);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 1_000_000 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    )
      invalid("Page must be 1–1000000 and pageSize must be 1–100.");
    const sort = input.sort ?? "updated";
    return (this.repository ?? unavailable()).list({
      ...input,
      page,
      pageSize,
      search: input.search?.trim(),
      // `status` wins; the older includeArchived flag maps to active/all.
      status: input.status ?? (includeArchived === "true" ? "all" : "active"),
      sort,
      order:
        input.order ?? (sort === "title" || sort === "status" ? "asc" : "desc"),
    });
  }
}
