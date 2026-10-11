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

/** Top bar title: "Series · S1 E3" once the series is known, else "S1 E3 · Episode". */
export function watchHeadline(video: WatchVideo, seriesTitle?: string) {
  if (video.kind !== 'episode') return video.title
  const position = `S${video.seasonNumber} E${video.episodeNumber}`
  return seriesTitle
    ? `${seriesTitle} · ${position}`
    : `${position} · ${video.title}`
}
/** Where the top bar Back control goes: the series, the film's details, or Browse. */
export function watchBackTarget(video: WatchVideo | undefined): WatchBack {
  if (!video) return { to: 'home' }
  if (video.kind !== 'episode') return { to: 'video', slug: video.slug }
  return video.seriesSlug
    ? { to: 'series', slug: video.seriesSlug }
    : { to: 'home' }
}
