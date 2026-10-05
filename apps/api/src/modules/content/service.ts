import { invalid, unavailable } from "../../shared/content-error";
import type { ContentPageInput } from "./model";
import type { ContentPageRepository } from "./repository";

export class ContentPageService {
  constructor(private readonly repository?: ContentPageRepository) {}
  list(input: ContentPageInput) {
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
    return (this.repository ?? unavailable()).list({
      ...input,
      page,
      pageSize,
      search: input.search?.trim(),
      includeArchived: input.includeArchived === "true",
    });
  }
}
