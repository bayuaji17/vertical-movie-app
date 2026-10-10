import { t } from "elysia";
import { Uuid, NextCursor } from "../../shared/content-model";
export const CreateGenreBody = t.Object(
  {
    name: t.String({ minLength: 1, maxLength: 80 }),
    slug: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 80,
        pattern: "^[a-z0-9]+(-[a-z0-9]+)*$",
      }),
    ),
  },
  { additionalProperties: false },
);
export const UpdateGenreBody = t.Object(
  {
    // Optimistic-concurrency token: the updatedAt the admin last read.
    expectedUpdatedAt: t.String({ minLength: 20, maxLength: 40 }),
    name: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
    slug: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 80,
        pattern: "^[a-z0-9]+(-[a-z0-9]+)*$",
      }),
    ),
  },
  { additionalProperties: false },
);
export const GenreDto = t.Object({
  id: Uuid,
  name: t.String(),
  slug: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  // Videos and series that currently carry this genre.
  usageCount: t.Integer({ minimum: 0 }),
});
export const GenreDeletedDto = t.Object({ id: Uuid });
export const GenreListDto = t.Object({
  items: t.Array(GenreDto),
  nextCursor: NextCursor,
});
export type CreateGenreInput = typeof CreateGenreBody.static;
export type UpdateGenreInput = typeof UpdateGenreBody.static;
