import { invalid, ContentError } from "./content-error";
export type RuntimeDependencies = { now: () => Date; id: () => string };
export const defaultRuntime: RuntimeDependencies = {
  now: () => new Date(),
  id: () => Bun.randomUUIDv7(),
};
export function cleanText(value: string | null | undefined, required = false) {
  if (value === undefined) return undefined;
  const result = value?.trim() || null;
  if (required && !result) invalid("Title must not be empty.");
  return result;
}
export function slugFor(title: string, id: string, input?: string, max = 180) {
  const slug =
    input ??
    (title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, max)
      .replace(/-$/, "") ||
      `content-${id}`);
  if (slug.length > max || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    invalid("Invalid slug.");
  return slug;
}
export function validateRelease(
  year: number | null | undefined,
  date: string | null | undefined,
) {
  if (
    year !== undefined &&
    year !== null &&
    (!Number.isInteger(year) || year < 1800 || year > 9999)
  )
    invalid("Invalid release year.");
  if (date) {
    const time = Date.parse(`${date}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d\d-\d\d$/.test(date) ||
      !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== date
    )
      invalid("Invalid release date.");
    if (
      year !== undefined &&
      year !== null &&
      Number(date.slice(0, 4)) !== year
    )
      invalid("Release date and year must match.");
  }
}
export function language(value: string | null | undefined) {
  const cleaned = cleanText(value);
  if (!cleaned) return cleaned;
  try {
    return Intl.getCanonicalLocales(cleaned)[0] ?? invalid("Invalid language.");
  } catch {
    invalid("Invalid BCP 47 language.");
  }
}
export function editable(
  row: { archivedAt: Date | null; rowVersion: number },
  expectedVersion?: number,
) {
  if (row.archivedAt)
    throw new ContentError(
      "CONTENT_ARCHIVED",
      "Archived content cannot be changed.",
    );
  if (expectedVersion !== undefined && row.rowVersion !== expectedVersion)
    throw new ContentError(
      "CONTENT_VERSION_CONFLICT",
      "Content has changed; reload before editing.",
    );
}
export function requireChanges(input: object) {
  if (Object.keys(input).filter((k) => k !== "expectedVersion").length === 0)
    invalid("At least one editable field is required.");
}
export function archiveState(
  row: {
    rowVersion: number;
    archivedAt: Date | null;
    publicationStatus?: string;
  },
  expectedVersion: number,
) {
  if (row.rowVersion !== expectedVersion)
    throw new ContentError(
      "CONTENT_VERSION_CONFLICT",
      "Content has changed; reload before archiving.",
    );
  if (row.publicationStatus === "published")
    throw new ContentError(
      "CONTENT_STATE_CONFLICT",
      "Unpublish before archiving.",
    );
  return row.archivedAt !== null;
}
export function cleanMetadata<
  T extends {
    title?: string | null;
    originalTitle?: string | null;
    synopsis?: string | null;
    description?: string | null;
    originalLanguage?: string | null;
  },
>(input: T) {
  const { title, originalTitle, synopsis, description, originalLanguage } =
    input;
  return {
    ...input,
    ...(title !== undefined
      ? { title: cleanText(title, true) ?? invalid("Title is required.") }
      : {}),
    ...(originalTitle !== undefined
      ? { originalTitle: cleanText(originalTitle) }
      : {}),
    ...(synopsis !== undefined ? { synopsis: cleanText(synopsis) } : {}),
    ...(description !== undefined
      ? { description: cleanText(description) }
      : {}),
    ...(originalLanguage !== undefined
      ? { originalLanguage: language(originalLanguage) }
      : {}),
  };
}
