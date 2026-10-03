import { Elysia } from "elysia";
import { errorDto, mapContentError } from "../shared/content-error";
export function createContentErrors() {
  return new Elysia({ name: "api.content-errors" }).onError(
    { as: "scoped" },
    ({ error, code, status, set }) => {
      set.headers["cache-control"] = "private, no-store";
      if (code === "VALIDATION" || code === "PARSE")
        return status(
          422,
          errorDto("VALIDATION_ERROR", "Request input is invalid."),
        );
      const domain = mapContentError(error);
      if (domain)
        return status(domain.httpStatus, errorDto(domain.code, domain.message));
      if (code === "NOT_FOUND")
        return status(
          404,
          errorDto("CONTENT_NOT_FOUND", "Content was not found."),
        );
      return status(
        500,
        errorDto("INTERNAL_ERROR", "Content request could not be completed."),
      );
    },
  );
}
