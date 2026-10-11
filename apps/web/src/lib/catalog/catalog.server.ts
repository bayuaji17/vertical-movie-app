import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { apiOriginFromOrigin } from '../api/client'
import { observeServerRead, ssrRequestId } from '../server/log.server'
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
      headers: {
        accept: 'application/json',
        'x-request-id': ssrRequestId(),
      },
      credentials: 'omit',
      redirect: 'error',
    }),
  )
})
export const readCatalogPageOnServer = createServerOnlyFn(
  (filters: CatalogFilters, cursor: string | null, signal: AbortSignal) =>
    observeServerRead('catalog.page', () =>
      serverClient(signal).page(filters, cursor, signal),
    ),
)
export const readCatalogGenresOnServer = createServerOnlyFn(
  (signal: AbortSignal) =>
    observeServerRead('catalog.genres', () =>
      serverClient(signal).genres(signal),
    ),
)
export const readCatalogFeaturedOnServer = createServerOnlyFn(
  (signal: AbortSignal) =>
    observeServerRead('catalog.featured', () =>
      serverClient(signal).featured(signal),
    ),
)
