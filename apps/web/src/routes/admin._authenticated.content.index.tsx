import { useCallback } from 'react'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { ContentList } from '#/components/admin/content-list'
import {
  contentSearch,
  contentSearchDefaults,
} from '#/lib/admin/content-list-state'
import type { ContentFilters } from '#/lib/admin/content-client'

export const Route = createFileRoute('/admin/_authenticated/content/')({
  validateSearch: contentSearch,
  search: { middlewares: [stripSearchParams(contentSearchDefaults)] },
  head: () => ({
    meta: [
      { title: 'Content · Vertical Movie' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ContentPage,
})
function ContentPage() {
  const filters = Route.useSearch(),
    navigate = Route.useNavigate()
  const onChange = useCallback(
    (patch: Partial<ContentFilters>) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        // Typing or clearing the search must not fill the history with entries.
        replace: 'search' in patch,
      })
    },
    [navigate],
  )
  return <ContentList filters={filters} onChange={onChange} />
}
