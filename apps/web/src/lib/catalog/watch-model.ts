import type { WatchVideo } from './content-model'

export type WatchBack =
  | { to: 'home' }
  | { to: 'video'; slug: string }
  | { to: 'series'; slug: string }

export const watchKindLabel = {
  movie: 'Film',
  standalone: 'Standalone',
  episode: 'Episode',
} as const

/** Top bar title: episodes lead with their position so it survives truncation. */
export function watchHeadline(video: WatchVideo) {
  return video.kind === 'episode'
    ? `S${video.seasonNumber} E${video.episodeNumber} · ${video.title}`
    : video.title
}
/** Where the top bar Back control goes: the series, the film's details, or Browse. */
export function watchBackTarget(video: WatchVideo | undefined): WatchBack {
  if (!video) return { to: 'home' }
  if (video.kind !== 'episode') return { to: 'video', slug: video.slug }
  return video.seriesSlug
    ? { to: 'series', slug: video.seriesSlug }
    : { to: 'home' }
}
