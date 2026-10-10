import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createPrivateApiClient, getBrowserApiBaseUrl } from '#/lib/api/client'

// Admin playback for a draft video, used by the embedded review player.
export function usePreviewLoader(id: string) {
  const cache = useQueryClient()
  return useCallback(
    async (signal: AbortSignal) => {
      const base = getBrowserApiBaseUrl()
      if (!base) throw new Error('API unavailable')
      const result = await createPrivateApiClient(base, cache)
        .admin.videos({ id })
        .playback.get({ fetch: { signal } })
      if (result.error) throw new Error('Preview unavailable')
      return result.data
    },
    [id, cache],
  )
}
