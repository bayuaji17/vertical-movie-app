import { createIsomorphicFn } from '@tanstack/react-start'
import { createPublicSettingsClient } from './client'
import { readSettingsOnServer } from './reader.server'

export const readPublicSettings = createIsomorphicFn()
  .server(readSettingsOnServer)
  .client((signal: AbortSignal) =>
    createPublicSettingsClient(location.origin + '/api').read(signal),
  )
