import type { DashboardSummary } from './dashboard-client'
import type { ContentStatus, ContentType } from './content-client'

export type ContentCounts = DashboardSummary['content']
type TypeCounts = ContentCounts[ContentType]

// Same meaning as the list filters: "active" is everything not archived and
// "all" includes archived. The dashboard counts archived items by their shown
// status, so the numbers match the list totals for the same filter.
export function statusCount(counts: TypeCounts, status: ContentStatus) {
  switch (status) {
    case 'active':
      return counts.total - counts.archived
    case 'all':
      return counts.total
    default:
      return counts[status]
  }
}
/** Count behind a type tab for the status that is currently selected. */
export const typeCount = (
  counts: ContentCounts | undefined,
  type: ContentType,
  status: ContentStatus,
) => (counts ? statusCount(counts[type], status) : undefined)
