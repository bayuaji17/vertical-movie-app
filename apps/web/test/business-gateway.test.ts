import { describe, expect, test } from 'bun:test'
import { businessRequestTimeoutMs } from '../src/lib/server/business-gateway'

describe('business gateway timeout policy', () => {
  test('allows 30 seconds only for the exact poster processing POST path', () => {
    const url =
      'http://web.example/api/admin/media/uploads/6f009a09-3d1c-4697-b6d5-3c2ab4c93e4c/process-poster'
    expect(businessRequestTimeoutMs(new Request(url, { method: 'POST' }))).toBe(
      30_000,
    )
    expect(businessRequestTimeoutMs(new Request(url, { method: 'GET' }))).toBe(
      10_000,
    )
    expect(
      businessRequestTimeoutMs(
        new Request(url.replace('/process-poster', '/complete'), {
          method: 'POST',
        }),
      ),
    ).toBe(10_000)
    expect(
      businessRequestTimeoutMs(
        new Request(url.replace('6f009a09', 'not-a-uuid'), {
          method: 'POST',
        }),
      ),
    ).toBe(10_000)
  })

  test('preserves a caller supplied default for every other business request', () => {
    expect(
      businessRequestTimeoutMs(
        new Request('http://web.example/api/admin/videos'),
        250,
      ),
    ).toBe(250)
  })
})
