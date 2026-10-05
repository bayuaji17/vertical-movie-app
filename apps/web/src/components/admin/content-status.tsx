import { Badge } from '#/components/ui/badge'

export function ContentStatus({
  item,
}: {
  item: { archivedAt: string | null; publicationStatus: string }
}) {
  return (
    <Badge variant="outline">
      {item.archivedAt
        ? 'Archived'
        : item.publicationStatus[0].toUpperCase() +
          item.publicationStatus.slice(1)}
    </Badge>
  )
}
