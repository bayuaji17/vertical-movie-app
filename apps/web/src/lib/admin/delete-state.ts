import type { DeleteKind, DeleteSummary } from './delete-client'

export type DeleteTarget = {
  kind: DeleteKind
  id: string
  title: string
  version: number
  publicationStatus?: string
  archivedAt?: string | null
}
const label: Record<DeleteKind, string> = {
  movie: 'film',
  standalone: 'standalone video',
  episode: 'episode',
  season: 'season',
  series: 'series',
}
export const deleteKindLabel = (kind: DeleteKind) => label[kind]
/** Why a target cannot be deleted right now, or undefined when it can. */
export function deleteBlock(target: DeleteTarget) {
  const published =
    target.publicationStatus === 'published' && !target.archivedAt
  if (published && target.kind !== 'season')
    return `A published ${label[target.kind]} cannot be deleted. Archive it first.`
}
/** Series are confirmed by typing the title; they remove the most data. */
export const requiresTypedTitle = (kind: DeleteKind) => kind === 'series'
export const titleMatches = (title: string, input: string) =>
  input.trim() === title.trim()
export function deleteConsequences(kind: DeleteKind) {
  const base = [
    'The record, its genres and its slug are removed. The slug becomes available again.',
    'Uploaded video, cover and processed files are removed from storage shortly after.',
    'This cannot be undone.',
  ]
  if (kind === 'series')
    return [
      'All seasons and episodes of this series are deleted with it, including any episode that was published.',
      ...base,
    ]
  if (kind === 'season')
    return ['All episodes of this season are deleted with it.', ...base]
  return base
}
/** Short sentence for a success message from the server's removal summary. */
export function deleteSummaryText(title: string, removed: DeleteSummary) {
  const parts = [
    removed.seasons > 0
      ? `${removed.seasons} season${removed.seasons === 1 ? '' : 's'}`
      : '',
    removed.videos > 0
      ? `${removed.videos} video${removed.videos === 1 ? '' : 's'}`
      : '',
    removed.assets > 0
      ? `${removed.assets} media file${removed.assets === 1 ? '' : 's'}`
      : '',
  ].filter(Boolean)
  return parts.length
    ? `Deleted “${title}” (${parts.join(', ')}).`
    : `Deleted “${title}”.`
}
