export type StablePoster = { key: unknown; url: string } | undefined

/**
 * The player poster is fixed for as long as the same source (`key`) plays. Each
 * playback renewal brings a new poster URL, but replacing the attribute would
 * reload the image (a flash), and an idle player would show an expired URL.
 */
export function nextStablePoster(
  current: StablePoster,
  key: unknown,
  url: string | undefined,
): StablePoster {
  if (current && current.key === key) return current
  return url ? { key, url } : undefined
}
