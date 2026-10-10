export const genreNameMax = 80
export const genreSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/u

export function slugifyGenreName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, genreNameMax)
    .replace(/-+$/u, '')
}
export function validateGenreName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Enter a genre name.'
  if (Array.from(name).length > genreNameMax)
    return `Use at most ${genreNameMax} characters.`
  return undefined
}
export function validateGenreSlug(value: string): string | undefined {
  const slug = value.trim()
  if (!slug) return undefined
  if (slug.length > genreNameMax)
    return `Use at most ${genreNameMax} characters.`
  if (!genreSlugPattern.test(slug))
    return 'Use lowercase letters, numbers and single hyphens.'
  return undefined
}
// An untouched slug is omitted so the API derives a unique one itself.
export function genreInput(name: string, slug: string, slugTouched: boolean) {
  const cleanSlug = slug.trim()
  return {
    name: name.trim(),
    ...(slugTouched && cleanSlug ? { slug: cleanSlug } : {}),
  }
}
export function genreErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || !('code' in error))
    return 'The change could not be confirmed. Check the genre list before submitting again.'
  const status = 'status' in error ? error.status : undefined
  switch (error.code) {
    case 'GENRES_EDIT_UNAVAILABLE':
      return "Editing genres isn't available yet."
    case 'SLUG_CONFLICT':
      return 'This slug is already in use. Choose another slug.'
    case 'GENRE_IN_USE':
      return 'This genre is used by content. Remove it from that content first.'
  }
  if (status === 401) return 'Your session has ended. Sign in again.'
  if (status === 403) return 'You do not have permission to manage genres.'
  if (status === 404) return 'This genre no longer exists. Refresh the list.'
  if (status === 409)
    return 'This genre changed or conflicts with another. Refresh the list.'
  if (status === 422) return 'The server could not accept these values.'
  if (status === 0 || (typeof status === 'number' && status >= 500))
    return 'The change could not be confirmed. Check the genre list before submitting again.'
  return 'The genre could not be saved. Your input is preserved.'
}
