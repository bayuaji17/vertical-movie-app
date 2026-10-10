import { useCallback } from 'react'
import type { MouseEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { openedFromBrowse } from '#/lib/public/catalog-navigation'

// Back link target is always `/`; when the detail page was opened from the
// browse grid, go back in history so the filter in that entry's URL returns.
export function useBrowseBack() {
  const router = useRouter()
  return useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      if (
        openedFromBrowse(router.history.location.state) &&
        router.history.canGoBack()
      ) {
        event.preventDefault()
        router.history.back()
      }
    },
    [router],
  )
}
