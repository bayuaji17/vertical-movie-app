import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { apiOriginFromOrigin } from '../api/client'
import {
  createPublicCatalogClient,
  CatalogRequestError,
} from './catalog-client'
import type { CatalogFilters } from './public-catalog-model'

const serverClient = createServerOnlyFn((signal: AbortSignal) => {
  setResponseHeader('cache-control', 'private, no-store')
  const origin = apiOriginFromOrigin(process.env.API_INTERNAL_URL ?? '')
  if (!origin) throw new CatalogRequestError(503)
  const request = getRequest()
  const combined = AbortSignal.any([
    signal,
    request.signal,
    AbortSignal.timeout(10_000),
  ])
  return createPublicCatalogClient(origin, (input, init) =>
    fetch(input, {
      ...init,
      signal: combined,
      headers: { accept: 'application/json' },
      credentials: 'omit',
      redirect: 'error',
    }),
  )
})
export const readCatalogPageOnServer = createServerOnlyFn(
  (filters: CatalogFilters, cursor: string | null, signal: AbortSignal) =>
    serverClient(signal).page(filters, cursor, signal),
)
export const readCatalogGenresOnServer = createServerOnlyFn(
  (signal: AbortSignal) => serverClient(signal).genres(signal),
)
export const readCatalogFeaturedOnServer = createServerOnlyFn(
  (signal: AbortSignal) => serverClient(signal).featured(signal),
)
