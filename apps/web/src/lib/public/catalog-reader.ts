import { createIsomorphicFn } from '@tanstack/react-start'
import { createPublicVideoClient } from './catalog-client'
import {
  readPublicVideoOnServer,
  setPublicStatusOnServer,
} from './catalog-reader.server'

export const publicVideoBrowser = () =>
  createPublicVideoClient(location.origin + '/api')
export const readPublicVideo = createIsomorphicFn()
  .server(readPublicVideoOnServer)
  .client((slug: string, signal: AbortSignal) =>
    publicVideoBrowser().detail(slug, signal),
  )
export const setPublicHttpStatus = createIsomorphicFn()
  .server(setPublicStatusOnServer)
  .client((_status: number | null) => undefined)
