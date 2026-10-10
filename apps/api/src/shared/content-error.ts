export type ContentErrorStatus = 404 | 409 | 422 | 503;
export class ContentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: ContentErrorStatus = 409,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
export function notFound(): never {
  throw new ContentError("CONTENT_NOT_FOUND", "Content was not found.", 404);
}
export function invalid(message: string): never {
  throw new ContentError("VALIDATION_ERROR", message, 422);
}
export function unavailable(): never {
  throw new ContentError(
    "CONTENT_DEPENDENCY_UNAVAILABLE",
    "Content service is unavailable.",
    503,
  );
}
// PostgreSQL SQLSTATE of a driver/ORM error, wherever the driver put it.
export function databaseErrorCode(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return;
  const error = "cause" in value && value.cause ? value.cause : value;
  if (!error || typeof error !== "object") return;
  const code =
    "errno" in error ? error.errno : "code" in error ? error.code : undefined;
  return typeof code === "string" ? code : undefined;
}
export function mapContentError(value: unknown): ContentError | undefined {
  if (value instanceof ContentError) return value;
  if (!value || typeof value !== "object") return;
  const error = "cause" in value && value.cause ? value.cause : value;
  if (!error || typeof error !== "object") return;
  const code =
    "errno" in error ? error.errno : "code" in error ? error.code : undefined;
  const constraint =
    "constraint" in error
      ? error.constraint
      : "constraint_name" in error
        ? error.constraint_name
        : undefined;
  if (code === "23505") {
    if (constraint === "content_operations_idempotency_unique")
      return new ContentError(
        "PUBLICATION_IDEMPOTENCY_CONFLICT",
        "Idempotency key is already in use.",
      );
    if (
      typeof constraint === "string" &&
      constraint.startsWith("upload_sessions_")
    )
      return new ContentError(
        "UPLOAD_STATE_CONFLICT",
        "An upload already exists or the idempotency key is in use.",
      );
    if (constraint === "videos_episode_number_unique")
      return new ContentError(
        "EPISODE_NUMBER_CONFLICT",
        "Episode number already exists in this season.",
      );
    if (constraint === "seasons_number_unique")
      return new ContentError(
        "SEASON_NUMBER_CONFLICT",
        "Season number already exists in this series.",
      );
    if (typeof constraint === "string" && constraint.endsWith("_slug_unique"))
      return new ContentError("SLUG_CONFLICT", "Slug already exists.");
  }
  if (code === "23503")
    return new ContentError(
      "CONTENT_STATE_CONFLICT",
      "Referenced content is no longer available.",
    );
  if (code === "23514")
    return new ContentError(
      "VALIDATION_ERROR",
      "Content violates a data constraint.",
      422,
    );
}
export function errorDto(code: string, message: string) {
  return { error: { code, message, requestId: crypto.randomUUID() } };
}
