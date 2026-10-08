import { createIsomorphicFn } from '@tanstack/react-start'
import { createPublicVideoClient } from './catalog-client'
import {
  readPublicVideosOnServer,
  readPublicVideoOnServer,
  setPublicStatusOnServer,
} from './catalog-reader.server'
import type { CatalogType } from './catalog-model'

export const publicVideoBrowser = () =>
  createPublicVideoClient(location.origin + '/api')
export const readPublicVideos = createIsomorphicFn()
  .server(readPublicVideosOnServer)
  .client((type: CatalogType, cursor: string | null, signal: AbortSignal) =>
    publicVideoBrowser().page(type, cursor, signal),
  )
export const readPublicVideo = createIsomorphicFn()
  .server(readPublicVideoOnServer)
  .client((slug: string, signal: AbortSignal) =>
    publicVideoBrowser().detail(slug, signal),
  )
export const setPublicHttpStatus = createIsomorphicFn()
  .server(setPublicStatusOnServer)
  .client((_status: number | null) => undefined)
