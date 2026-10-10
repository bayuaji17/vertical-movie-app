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
// Network loss and server errors leave the outcome unknown. A refused edit
// (no endpoint yet) provably changed nothing, so it is not unconfirmed.
export function isUnconfirmed(error: unknown): boolean {
  if (!(error instanceof GenresApiError)) return true
  if (error.code === 'GENRES_EDIT_UNAVAILABLE') return false
  return error.status === 0 || error.status >= 500
}
export function failureOutcome(error: unknown): GenreOutcome {
  const known = error instanceof GenresApiError ? error : undefined
  const unconfirmed = isUnconfirmed(error)
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

// Rename keeps the current slug unless the admin changed it.
export function renameInput(genre: Genre, values: GenreFormValues): GenreInput {
  const slug = values.slug.trim()
  return {
    name: values.name.trim(),
    ...(slug && slug !== genre.slug ? { slug } : {}),
  }
}
export async function submitRename(
  genre: Genre,
  save: (id: string, input: GenreInput) => Promise<Genre>,
  values: GenreFormValues,
): Promise<GenreOutcome> {
  const invalid = validateGenreForm({ ...values, slugTouched: true })
  if (invalid) return { status: 'invalid', ...invalid }
  const input = renameInput(genre, values)
  if (input.name === genre.name && !input.slug)
    return { status: 'invalid', nameError: 'Change the name or slug first.' }
  try {
    return { status: 'saved', genre: await save(genre.id, input) }
  } catch (error) {
    return failureOutcome(error)
  }
}
export type RemoveOutcome =
  | { status: 'removed' }
  | { status: 'failed'; message: string; inUse: boolean; unconfirmed: boolean }
export async function submitRemove(
  remove: (id: string) => Promise<void>,
  genre: Genre,
): Promise<RemoveOutcome> {
  try {
    await remove(genre.id)
    return { status: 'removed' }
  } catch (error) {
    const known = error instanceof GenresApiError ? error : undefined
    return {
      status: 'failed',
      message: genreErrorMessage(error),
      inUse: known?.code === 'GENRE_IN_USE',
      unconfirmed: isUnconfirmed(error),
    }
  }
}
