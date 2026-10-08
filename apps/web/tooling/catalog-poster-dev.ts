import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'

/** Nitro's dev pre-middleware skips image destinations. Route only canonical API posters to it. */
export function routeCatalogPosterToNitro(
  request: Pick<IncomingMessage, 'method' | 'url' | 'headers'>,
) {
  if (
    request.method === 'GET' &&
    request.headers['sec-fetch-dest'] === 'image' &&
    /^\/api\/catalog\/(?:movie|series|standalone)\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/poster(?:\?|$)/i.test(
      request.url ?? '',
    )
  )
    request.headers['sec-fetch-dest'] = 'empty'
}
export function catalogPosterDev(): Plugin {
  return {
    name: 'public-catalog-poster-dev',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        routeCatalogPosterToNitro(request)
        next()
      })
    },
  }
}
