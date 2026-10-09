import { useQuery, useQueryClient } from '@tanstack/react-query'
import { publicSettingsOptions } from '#/lib/settings/queries'
import { defaultSiteSettings } from '#/lib/settings/model'
import { usePublicOnline } from './use-public-online'

export function useSiteSettings() {
  const cache = useQueryClient(),
    online = usePublicOnline()
  const query = useQuery({
    ...publicSettingsOptions(cache),
    enabled: typeof window !== 'undefined' && online,
  })
  return { settings: query.data?.item ?? defaultSiteSettings, query }
}
