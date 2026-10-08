import { createServerOnlyFn } from '@tanstack/react-start'
import {
  getRequest,
  setResponseHeader,
  setResponseStatus,
} from '@tanstack/react-start/server'
import { apiOriginFromOrigin } from '../api/client'
import { createPublicContentClient } from './content-client'
import { CatalogRequestError } from './catalog-client'
import type { ContentKind } from './content-model'

export const setContentStatusOnServer = createServerOnlyFn(
  (status: number | null) =>
    setResponseStatus(
      status === 404 || status === 422 ? 404 : status ? 503 : 200,
    ),
)
const client = createServerOnlyFn((signal: AbortSignal) => {
  setResponseHeader('cache-control', 'private, no-store')
  const origin = apiOriginFromOrigin(process.env.API_INTERNAL_URL ?? '')
  if (!origin) throw new CatalogRequestError(503)
  const combined = AbortSignal.any([
    signal,
    getRequest().signal,
    AbortSignal.timeout(10_000),
  ])
  return createPublicContentClient(origin, (input, init) =>
    fetch(input, {
      ...init,
      signal: combined,
      headers: { accept: 'application/json' },
      credentials: 'omit',
      redirect: 'error',
    }),
  )
})
export const detailOnServer = createServerOnlyFn(
  (kind: ContentKind, slug: string, signal: AbortSignal) =>
    client(signal).detail(kind, slug, signal),
)
export const episodesOnServer = createServerOnlyFn(
  (slug: string, cursor: string | null, signal: AbortSignal) =>
    client(signal).episodes(slug, cursor, signal),
)
export const watchOnServer = createServerOnlyFn(
  (slug: string, signal: AbortSignal) => client(signal).watch(slug, signal),
)
