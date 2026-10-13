import { Badge } from '#/components/ui/badge'
import type { ContentItem } from '#/lib/admin/content-client'
import { genreChips, seriesSummary } from '#/lib/admin/content-readiness'

/** Year, genres and Series size under a title; renders nothing when empty. */
export function ContentMeta({ item }: { item: ContentItem }) {
  const { names, more } = genreChips(item)
  const summary = seriesSummary(item)
  const facts = [summary, item.releaseYear ? String(item.releaseYear) : '']
    .filter(Boolean)
    .join(' · ')
  if (!facts && names.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {facts && <span>{facts}</span>}
      {names.map((name) => (
        <Badge key={name} variant="secondary" className="max-w-32 truncate">
          {name}
        </Badge>
      ))}
      {more > 0 && (
        <Badge variant="outline">
          +{more}
          <span className="sr-only"> more genres</span>
        </Badge>
      )}
    </div>
  )
}
