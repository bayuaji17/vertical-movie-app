import { expect, test } from 'bun:test'
import { createPublicSettingsClient } from '../src/lib/settings/client'
import {
  defaultSiteSettings,
  settingsTtlMs,
  verifiedPublicSettings,
} from '../src/lib/settings/model'

test('public DTO rejects private/unknown/oversize/controls/freshness and supports non-BMP Unicode', () => {
  const dto = {
    item: { ...defaultSiteSettings, siteName: '😀'.repeat(80) },
    version: 1,
    freshForMs: settingsTtlMs,
  }
  expect(verifiedPublicSettings(dto).item.siteName).toBe(dto.item.siteName)
  for (const bad of [
    { ...dto, secret: 'private' },
    { ...dto, freshForMs: settingsTtlMs + 1 },
    { ...dto, version: 0 },
    { ...dto, item: { ...dto.item, updatedAt: 'private' } },
    { ...dto, item: { ...dto.item, tagline: 'new\nline' } },
    { ...dto, item: { ...dto.item, siteName: '😀'.repeat(81) } },
  ])
    expect(() => verifiedPublicSettings(bad)).toThrow()
})
test('transport deducts elapsed time, has no credentials/redirects and rejects huge bodies', async () => {
  let now = 1000,
    last: RequestInit | undefined
  const client = createPublicSettingsClient(
    'http://api.example',
    async (_input, init) => {
      last = init
      now += 500
      return Response.json({
        item: defaultSiteSettings,
        version: 1,
        freshForMs: 10000,
      })
    },
    () => now,
  )
  const value = await client.read(new AbortController().signal)
  expect(value.expiresAt - now).toBe(9500)
  expect(last?.credentials).toBe('omit')
  expect(last?.redirect).toBe('error')
  await expect(
    createPublicSettingsClient('http://api.example', async () =>
      Response.json({ huge: 'x'.repeat(20000) }),
    ).read(new AbortController().signal),
  ).rejects.toThrow()
})
