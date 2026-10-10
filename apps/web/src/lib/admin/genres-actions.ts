import { GenresApiError } from './genres-client'
import type { Genre, GenreInput } from './genres-client'
import {
  genreErrorMessage,
  genreInput,
  slugifyGenreName,
  validateGenreName,
  validateGenreSlug,
} from './genres-form'

export type GenreFormValues = {
  name: string
  slug: string
  slugTouched: boolean
}
export type GenreOutcome =
  | { status: 'saved'; genre: Genre }
  | { status: 'invalid'; nameError?: string; slugError?: string }
  | {
      status: 'failed'
      message: string
      slugError?: string
      unconfirmed: boolean
    }

// The slug shown while it is untouched is derived from the name.
export const effectiveSlug = (values: GenreFormValues) =>
  values.slugTouched ? values.slug : slugifyGenreName(values.name)

export function validateGenreForm(values: GenreFormValues) {
  const nameError = validateGenreName(values.name)
  const slugError = validateGenreSlug(effectiveSlug(values))
  return nameError || slugError ? { nameError, slugError } : undefined
}
export function failureOutcome(error: unknown): GenreOutcome {
  const known = error instanceof GenresApiError ? error : undefined
  const unconfirmed = !known || known.status === 0 || known.status >= 500
  return {
    status: 'failed',
    message: genreErrorMessage(error),
    slugError:
      known?.code === 'SLUG_CONFLICT' ? genreErrorMessage(error) : undefined,
    unconfirmed,
  }
}
// One submit = one request: no automatic retry, so an unconfirmed result is
// reported and the admin checks the list before trying again.
export async function submitGenre(
  save: (input: GenreInput) => Promise<Genre>,
  values: GenreFormValues,
): Promise<GenreOutcome> {
  const invalid = validateGenreForm(values)
  if (invalid) return { status: 'invalid', ...invalid }
  try {
    const genre = await save(
      genreInput(values.name, effectiveSlug(values), values.slugTouched),
    )
    return { status: 'saved', genre }
  } catch (error) {
    return failureOutcome(error)
  }
}
