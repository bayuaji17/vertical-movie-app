import type { createApiClient } from '../src/lib/api/client'

export async function settingsContract(
  client: ReturnType<typeof createApiClient>,
) {
  const publicData = await client['site-settings'].get()
  if (publicData.data) {
    const version: number = publicData.data.version
    const text: string = publicData.data.item.siteName
    void version
    void text
    // @ts-expect-error Public projection has no audit data.
    void publicData.data.item.updatedAt
  }
  await client.admin.settings.get({ query: { fresh: '1' } })
  await client.admin.settings.patch({
    siteName: 'Name',
    tagline: '',
    description: '',
    footerText: '',
    expectedVersion: 1,
  })
  // @ts-expect-error Settings Save requires all four fields.
  await client.admin.settings.patch({ siteName: 'Name', expectedVersion: 1 })
  // @ts-expect-error Only exact private fresh=1 is supported.
  await client.admin.settings.get({ query: { fresh: 'true' } })
}
