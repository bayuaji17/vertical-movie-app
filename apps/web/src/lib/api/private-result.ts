export class PrivateApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}
export type PrivateResultPolicy = {
  fallbackCode: string
  failureMessage: string
  networkMessage: string
  error: (status: number, code: string, message: string) => PrivateApiError
}
function domainCode(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === 'object' &&
    'error' in value &&
    value.error &&
    typeof value.error === 'object' &&
    'code' in value.error &&
    typeof value.error.code === 'string' &&
    /^[A-Z][A-Z0-9_]{0,79}$/.test(value.error.code)
  )
    return value.error.code
  return fallback
}
function aborted(value: unknown) {
  return (
    value &&
    typeof value === 'object' &&
    'name' in value &&
    value.name === 'AbortError'
  )
}
export async function unwrapPrivateResult<T>(
  request: Promise<{
    data: T | null
    error: { status: number; value: unknown } | null
  }>,
  policy: PrivateResultPolicy,
): Promise<T> {
  let result: Awaited<typeof request>
  try {
    result = await request
  } catch (error) {
    if (aborted(error)) throw error
    throw policy.error(0, 'NETWORK_ERROR', policy.networkMessage)
  }
  if (aborted(result.error?.value)) throw result.error?.value
  // Eden wraps fetch errors in synthetic 503 responses; preserve cancellation/network semantics.
  if (result.error?.value instanceof Error)
    throw policy.error(0, 'NETWORK_ERROR', policy.networkMessage)
  if (result.error)
    throw policy.error(
      result.error.status,
      domainCode(result.error.value, policy.fallbackCode),
      policy.failureMessage,
    )
  if (result.data == null)
    throw policy.error(
      0,
      'INVALID_RESPONSE',
      'The response could not be confirmed.',
    )
  return result.data
}
