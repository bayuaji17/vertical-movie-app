import type { ContentItem } from './content-client'

export type ReadinessTone = 'good' | 'info' | 'warn' | 'danger' | 'muted'
export type ReadinessIcon =
  | 'live'
  | 'ready'
  | 'processing'
  | 'uploading'
  | 'video'
  | 'cover'
  | 'failed'
  | 'episodes'
export type Readiness = {
  label: string
  tone: ReadinessTone
  icon: ReadinessIcon
  // Longer text for the tooltip and screen readers.
  hint: string
}

/**
 * What the admin should do next for a row. `mediaState` comes from the same
 * predicate the publish check uses; when the API did not send it (older
 * server) nothing is claimed.
 */
export function readiness(item: ContentItem): Readiness | undefined {
  if (item.archivedAt) return undefined
  if (item.publicationStatus === 'published')
    return {
      label: 'Live',
      tone: 'good',
      icon: 'live',
      hint: 'Published and visible to viewers.',
    }
  if (item.type === 'series') {
    if (item.episodeCount === 0)
      return {
        label: 'Needs episodes',
        tone: 'warn',
        icon: 'episodes',
        hint: 'Add a season and episodes before publishing episodes.',
      }
    return undefined
  }
  switch (item.mediaState) {
    case 'ready':
      return {
        label: 'Ready to publish',
        tone: 'good',
        icon: 'ready',
        hint: 'Video and cover are verified.',
      }
    case 'needs-video':
      return {
        label: 'Needs video',
        tone: 'warn',
        icon: 'video',
        hint: 'Upload the video to continue.',
      }
    case 'needs-cover':
      return {
        label: 'Needs cover',
        tone: 'warn',
        icon: 'cover',
        hint: 'The video is ready; add a cover image.',
      }
    case 'uploading':
      return {
        label: 'Uploading',
        tone: 'info',
        icon: 'uploading',
        hint: 'An upload is in progress.',
      }
    case 'processing':
      return {
        label: 'Processing',
        tone: 'info',
        icon: 'processing',
        hint: 'Media is being processed.',
      }
    case 'failed':
      return {
        label: 'Failed',
        tone: 'danger',
        icon: 'failed',
        hint: 'Processing failed. Open the item to retry.',
      }
    default:
      return undefined
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
/** "3 seasons · 12 episodes" for a Series row, otherwise nothing. */
export function seriesSummary(item: ContentItem) {
  if (item.type !== 'series' || item.seasonCount === undefined) return undefined
  return `${plural(item.seasonCount, 'season')} · ${plural(item.episodeCount ?? 0, 'episode')}`
}
const shownGenres = 2
/** Up to two genre names and how many more there are. */
export function genreChips(item: ContentItem) {
  const names = item.genres ?? []
  const total = item.genreCount ?? names.length
  return {
    names: names.slice(0, shownGenres),
    more: Math.max(0, total - shownGenres),
  }
}
