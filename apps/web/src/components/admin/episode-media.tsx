import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '#/hooks/use-admin-principal'
import { useUploadManager } from '#/hooks/use-upload-manager'
import { browserMediaClient } from '#/lib/admin/media-client'
import { ownerMediaOptions } from '#/lib/admin/media-queries'
import { MediaPanelView } from './media-panel'

export function EpisodeMedia({
  seriesId,
  episodeId,
}: {
  seriesId: string
  episodeId: string
}) {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    client = useMemo(() => browserMediaClient(cache), [cache])
  const owner = { ownerType: 'video' as const, ownerId: episodeId },
    query = useQuery(ownerMediaOptions(client, user.id, owner))
  const context = useMemo(
      () => ({ type: 'episode' as const, seriesId }),
      [seriesId],
    ),
    { manager } = useUploadManager(owner, context, query.data)
  return (
    <MediaPanelView
      owner={owner}
      query={query}
      manager={manager}
      previewSearch={{ type: 'episode', seriesId }}
    />
  )
}
