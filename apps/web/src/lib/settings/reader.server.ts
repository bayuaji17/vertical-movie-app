import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { settingsServerCache } from './server-cache.server'
import { settingsReceipt } from './model'

export const readSettingsOnServer = createServerOnlyFn(
  async (signal: AbortSignal) => {
    setResponseHeader('cache-control', 'private, no-store')
    const started = Date.now()
    const dto = await settingsServerCache.get(
      process.env.API_INTERNAL_URL ?? '',
      AbortSignal.any([signal, getRequest().signal]),
    )
    return settingsReceipt(dto, started)
  },
)
