import { Elysia } from "elysia";
import {
  createRequireAdmin,
  type RequireAdminDependencies,
} from "../auth/admin/guard";
import { createContentErrors } from "../../plugins/errors";
import {
  ErrorResponses,
  IdParams,
  ListQuery,
} from "../../shared/content-model";
import {
  CreateGenreBody,
  GenreDeletedDto,
  GenreDto,
  GenreListDto,
  UpdateGenreBody,
} from "./model";
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
    .patch(
      "/admin/genres/:id",
      ({ params, body }) => service.update(params.id, body),
      {
        requireAdmin: true,
        params: IdParams,
        body: UpdateGenreBody,
        response: { 200: GenreDto, ...ErrorResponses },
        detail: {
          tags: ["Genres"],
          summary: "Rename a genre or change its slug",
          operationId: "updateGenre",
          security: [{ betterAuthSessionCookie: [] }],
        },
      },
    )
    .delete("/admin/genres/:id", ({ params }) => service.remove(params.id), {
      requireAdmin: true,
      params: IdParams,
      response: { 200: GenreDeletedDto, ...ErrorResponses },
      detail: {
        tags: ["Genres"],
        summary: "Delete a genre that no content uses",
        operationId: "deleteGenre",
        security: [{ betterAuthSessionCookie: [] }],
      },
    })
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
