import { createAuthGateway } from './auth-gateway'

export function businessRequestTimeoutMs(
  request: Request,
  fallback = 10_000,
): number {
  const isPosterProcessing =
    request.method === 'POST' &&
    /^\/api\/admin\/media\/uploads\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/process-poster$/i.test(
      new URL(request.url).pathname,
    )
  return isPosterProcessing ? 30_000 : fallback
}

export function createBusinessGateway(
  dependencies: Parameters<typeof createAuthGateway>[1] = {},
) {
  const timeoutMsForRequest = (request: Request) => {
    const fallback =
      dependencies.timeoutMsForRequest?.(request) ??
      dependencies.timeoutMs ??
      10_000
    return businessRequestTimeoutMs(request, fallback)
  }
  return createAuthGateway('business', {
    ...dependencies,
    timeoutMsForRequest,
  })
}
