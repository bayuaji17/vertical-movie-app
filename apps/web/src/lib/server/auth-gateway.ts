import { isDisabledAuthPath } from '@repo/auth/server'

type GatewayTarget = 'auth' | 'business'

type GatewayDependencies = {
  getApiInternalUrl?: () => string | undefined
  getPublicOrigin?: () => string | undefined
  fetcher?: (request: Request) => Promise<Response>
  timeoutMs?: number
  timeoutMsForRequest?: (request: Request) => number
  maxRequestBodyBytes?: number
}

type RequestBodyRead =
  { ok: true; body: ArrayBuffer | null } | { ok: false; tooLarge: boolean }

const targetPaths: Record<GatewayTarget, (pathname: string) => boolean> = {
  business: (pathname) =>
    /^\/api\/(?:admin\/(?:videos|series|seasons|genres|media|content)(?:\/|$)|videos(?:\/|$)|series(?:\/|$)|playback\/videos\/)/.test(
      pathname,
    ) && !/%|\\/.test(pathname),
  auth: (pathname) =>
    pathname === '/api/auth' || pathname.startsWith('/api/auth/'),
}

const requestHeaderAllowlist = new Set([
  'accept',
  'authorization',
  'content-encoding',
  'content-type',
  'cookie',
  'origin',
  'user-agent',
])

const responseHeaderAllowlist = [
  'content-disposition',
  'content-language',
  'content-type',
  'etag',
  'last-modified',
  'retry-after',
  'vary',
  'www-authenticate',
] as const

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { 'cache-control': 'private, no-store' } },
  )
}

function getApiOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username !== '' ||
      url.password !== '' ||
      url.pathname !== '/' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return undefined
    }
    return url.origin
  } catch {
    return undefined
  }
}

async function readLimitedBody(
  request: Request,
  maxBytes: number,
  signal: AbortSignal,
): Promise<RequestBodyRead> {
  if (!request.body) return { ok: true, body: null }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await request.body.cancel().catch(() => undefined)
    return { ok: false, tooLarge: true }
  }

  const reader = request.body.getReader()
  const abortReader = () => {
    void reader.cancel(signal.reason).catch(() => undefined)
  }
  if (signal.aborted) abortReader()
  else signal.addEventListener('abort', abortReader, { once: true })

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      totalBytes += chunk.value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        return { ok: false, tooLarge: true }
      }
      chunks.push(chunk.value)
    }
  } finally {
    signal.removeEventListener('abort', abortReader)
    reader.releaseLock()
  }

  if (totalBytes === 0) return { ok: true, body: new ArrayBuffer(0) }
  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, body: body.buffer }
}

function forwardedRequestHeaders(
  request: Request,
  includePrivate = true,
): Headers {
  const headers = new Headers()
  for (const [name, value] of request.headers) {
    if (
      requestHeaderAllowlist.has(name.toLowerCase()) &&
      (includePrivate ||
        !['cookie', 'authorization'].includes(name.toLowerCase()))
    ) {
      headers.append(name, value)
    }
  }
  return headers
}

function forwardedResponseHeaders(
  response: Response,
  apiOrigin: string,
  publicOrigin: string,
): Headers | undefined {
  const headers = new Headers()
  for (const name of responseHeaderAllowlist) {
    const value = response.headers.get(name)
    if (value !== null) headers.set(name, value)
  }

  const location = response.headers.get('location')
  if (location !== null) {
    try {
      const target = new URL(location, publicOrigin)
      if (
        !['http:', 'https:'].includes(target.protocol) ||
        target.username !== '' ||
        target.password !== '' ||
        (target.origin !== publicOrigin && target.origin !== apiOrigin)
      ) {
        return undefined
      }
      headers.set(
        'location',
        `${target.pathname}${target.search}${target.hash}`,
      )
    } catch {
      return undefined
    }
  }

  for (const cookie of response.headers.getSetCookie()) {
    headers.append('set-cookie', cookie)
  }
  headers.set('cache-control', 'private, no-store')
  return headers
}

export function createAuthGateway(
  target: GatewayTarget,
  dependencies: GatewayDependencies = {},
): (request: Request) => Promise<Response> {
  const getApiInternalUrl =
    dependencies.getApiInternalUrl ?? (() => process.env.API_INTERNAL_URL)
  const getPublicOrigin =
    dependencies.getPublicOrigin ??
    (() => process.env.VITE_API_URL ?? import.meta.env.VITE_API_URL)
  const fetcher = dependencies.fetcher ?? ((request) => fetch(request))
  const defaultTimeoutMs = dependencies.timeoutMs ?? 10_000
  const maxRequestBodyBytes = dependencies.maxRequestBodyBytes ?? 1_048_576

  return async (request) => {
    const incomingUrl = new URL(request.url)
    if (!targetPaths[target](incomingUrl.pathname)) {
      return errorResponse(
        404,
        'NOT_FOUND',
        'The requested route is unavailable.',
      )
    }

    if (
      target === 'auth' &&
      isDisabledAuthPath(
        incomingUrl.pathname.replace(/^\/api\/auth/, ''),
        request.method,
      )
    ) {
      return errorResponse(404, 'NOT_FOUND', 'This operation is unavailable.')
    }
    const apiOrigin = getApiOrigin(getApiInternalUrl())
    const publicOrigin = getApiOrigin(getPublicOrigin())
    if (!apiOrigin || !publicOrigin) {
      return errorResponse(
        503,
        'AUTH_GATEWAY_UNAVAILABLE',
        'The authentication service is temporarily unavailable.',
      )
    }

    const privateBusiness =
      target === 'business' && incomingUrl.pathname.startsWith('/api/admin/')
    if (
      privateBusiness &&
      !['GET', 'HEAD'].includes(request.method) &&
      request.headers.get('origin') &&
      request.headers.get('origin') !== publicOrigin
    )
      return errorResponse(
        403,
        'ORIGIN_FORBIDDEN',
        'Request origin is not allowed.',
      )
    const upstreamPath =
      target === 'business'
        ? incomingUrl.pathname.slice(4)
        : incomingUrl.pathname
    const upstreamUrl = new URL(
      `${upstreamPath}${incomingUrl.search}`,
      apiOrigin,
    )
    const abortController = new AbortController()
    const timeoutMs =
      dependencies.timeoutMsForRequest?.(request) ?? defaultTimeoutMs
    let cleanedUp = false
    const timeoutReason = new Error('Authentication gateway timed out.')
    const timeout = setTimeout(() => {
      abortController.abort(timeoutReason)
    }, timeoutMs)
    const abortFromClient = () => abortController.abort(request.signal.reason)
    if (request.signal.aborted) abortFromClient()
    else
      request.signal.addEventListener('abort', abortFromClient, { once: true })
    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      clearTimeout(timeout)
      request.signal.removeEventListener('abort', abortFromClient)
    }

    try {
      let body: ArrayBuffer | null = null
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const result = await readLimitedBody(
          request,
          maxRequestBodyBytes,
          abortController.signal,
        )
        if (!result.ok) {
          cleanup()
          return errorResponse(
            413,
            'PAYLOAD_TOO_LARGE',
            'The request body exceeds the allowed size.',
          )
        }
        body = result.body
      }

      const requestInit: RequestInit = {
        method: request.method,
        headers: forwardedRequestHeaders(
          request,
          target === 'auth' || privateBusiness,
        ),
        redirect: 'manual',
        signal: abortController.signal,
      }
      if (body !== null) requestInit.body = body
      const upstreamRequest = new Request(upstreamUrl, requestInit)
      const upstreamResponse = await fetcher(upstreamRequest)
      const headers = forwardedResponseHeaders(
        upstreamResponse,
        apiOrigin,
        publicOrigin,
      )
      if (!headers) {
        await upstreamResponse.body?.cancel().catch(() => undefined)
        cleanup()
        return errorResponse(
          502,
          'AUTH_GATEWAY_INVALID_RESPONSE',
          'The authentication service returned an invalid redirect.',
        )
      }
      if (target === 'business') {
        headers.delete('set-cookie')
        if (headers.has('location')) {
          await upstreamResponse.body?.cancel().catch(() => undefined)
          cleanup()
          return errorResponse(
            502,
            'BUSINESS_GATEWAY_INVALID_RESPONSE',
            'Unexpected redirect.',
          )
        }
        const cache = upstreamResponse.headers.get('cache-control')
        if (!privateBusiness && cache === 'private, max-age=60')
          headers.set('cache-control', cache)
      }
      const noBodyStatus = [204, 205, 304].includes(upstreamResponse.status)
      let responseBody: ArrayBuffer | null = null
      if (!noBodyStatus && upstreamResponse.body) {
        const result = await readLimitedBody(
          new Request('http://response.invalid', {
            method: 'POST',
            body: upstreamResponse.body,
            duplex: 'half',
          } as RequestInit),
          maxRequestBodyBytes,
          abortController.signal,
        )
        if (abortController.signal.aborted) throw abortController.signal.reason
        if (!result.ok) {
          cleanup()
          return errorResponse(
            502,
            'AUTH_GATEWAY_INVALID_RESPONSE',
            'The authentication service returned an invalid response.',
          )
        }
        responseBody = result.body
      }
      cleanup()
      return new Response(responseBody, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers,
      })
    } catch {
      cleanup()
      if (request.signal.aborted)
        return errorResponse(
          499,
          'AUTH_REQUEST_ABORTED',
          'The request was cancelled.',
        )
      if (abortController.signal.reason === timeoutReason) {
        return errorResponse(
          504,
          'AUTH_GATEWAY_TIMEOUT',
          'The authentication service did not respond in time.',
        )
      }
      return errorResponse(
        503,
        'AUTH_GATEWAY_UNAVAILABLE',
        'The authentication service is temporarily unavailable.',
      )
    }
  }
}
