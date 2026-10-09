import { z } from 'zod'

export const settingsTtlMs = 3_600_000
export const settingsLimits = {
  siteName: 80,
  tagline: 160,
  description: 500,
  footerText: 300,
} as const
export type SiteSettings = Record<keyof typeof settingsLimits, string>
export const defaultSiteSettings: SiteSettings = Object.freeze({
  siteName: 'Vertical Movie',
  tagline: 'Find your next story.',
  description:
    'Discover films and standalone stories in portrait. Open to everyone.',
  footerText: 'Stories made for portrait.',
})
const hasControl = (text: string) =>
  [...text].some((c) => {
    const n = c.codePointAt(0)!
    return n < 32 || (n >= 127 && n <= 159) || n === 0x2028 || n === 0x2029
  })
const plain = (max: number, required = false) =>
  z
    .string()
    .refine(
      (s) =>
        s === s.trim() &&
        !hasControl(s) &&
        [...s].length <= max &&
        (!required || [...s].length > 0),
    )
export const settingsFieldsSchema = z
  .object({
    siteName: plain(80, true),
    tagline: plain(160),
    description: plain(500),
    footerText: plain(300),
  })
  .strict()
export const settingsVersion = z.number().int().min(1).max(2147483647)
const freshness = z.number().int().min(0).max(settingsTtlMs)
export const publicSettingsSchema = z
  .object({
    item: settingsFieldsSchema,
    version: settingsVersion,
    freshForMs: freshness,
  })
  .strict()
export const privateSettingsSchema = z
  .object({
    item: settingsFieldsSchema.extend({
      rowVersion: settingsVersion,
      updatedAt: z.iso.datetime(),
    }),
    freshForMs: freshness,
  })
  .strict()
export type PublicSettingsDto = z.infer<typeof publicSettingsSchema>
export type PrivateSettingsDto = z.infer<typeof privateSettingsSchema>
export type PublicSettingsData = Omit<PublicSettingsDto, 'freshForMs'> & {
  expiresAt: number
}
export class SettingsRequestError extends Error {
  constructor(public readonly status: number) {
    super('Site settings are temporarily unavailable.')
  }
}
export function verifiedPublicSettings(value: unknown): PublicSettingsDto {
  const parsed = publicSettingsSchema.safeParse(value)
  if (!parsed.success) throw new SettingsRequestError(502)
  return parsed.data
}
export function projectPrivateSettings(value: unknown): PublicSettingsDto {
  const parsed = privateSettingsSchema.safeParse(value)
  if (!parsed.success) throw new SettingsRequestError(502)
  const { rowVersion, updatedAt: _date, ...item } = parsed.data.item
  return { item, version: rowVersion, freshForMs: parsed.data.freshForMs }
}
export function settingsReceipt(
  value: PublicSettingsDto,
  started: number,
): PublicSettingsData {
  return {
    item: { ...value.item },
    version: value.version,
    expiresAt: started + value.freshForMs,
  }
}
export function publicSettingsDto(
  data: PublicSettingsData,
  now = Date.now(),
): PublicSettingsDto {
  return {
    item: { ...data.item },
    version: data.version,
    freshForMs: Math.max(0, Math.min(settingsTtlMs, data.expiresAt - now)),
  }
}
export function normalizedSettings(fields: SiteSettings) {
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, v.trim()]),
  ) as SiteSettings
}
