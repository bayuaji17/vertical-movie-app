import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import { ErrorResponses, ListQuery } from "../../shared/content-model";
import { CreateGenreBody, GenreDto, GenreListDto } from "./model";
import { GenresService } from "./service";
export function createGenresModule({
  service = new GenresService(),
  getSession,
}: RequireAdminDependencies & { service?: GenresService }) {
  return new Elysia({ name: "api.genres", normalize: false })
    .use(createContentErrors())
    .use(createRequireAdmin({ getSession }))
    .post(
      "/admin/genres",
      ({ body, status }) =>
        service.create(body).then((dto) => status(201, dto)),
      {
        requireAdmin: true,
        body: CreateGenreBody,
        response: { 201: GenreDto, ...ErrorResponses },
        detail: {
          tags: ["Genres"],
          summary: "Create a genre",
          operationId: "createGenre",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .get("/admin/genres", ({ query }) => service.list(query), {
      requireAdmin: true,
      query: ListQuery,
      response: { 200: GenreListDto, ...ErrorResponses },
      detail: {
        tags: ["Genres"],
        summary: "List genre taxonomy",
        operationId: "listGenres",
        security: [{ betterAuthSessionCookie: [] }],
      },
    });
}
