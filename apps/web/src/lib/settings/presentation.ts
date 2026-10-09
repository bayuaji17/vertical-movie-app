import { defaultSiteSettings } from './model'
import type { PublicSettingsData, SiteSettings } from './model'

export function settingsFromMatches(
  matches: ReadonlyArray<{ routeId: string; loaderData?: unknown }>,
): SiteSettings {
  const root = matches.find((m) => m.routeId === '__root__')?.loaderData as
    { settings?: PublicSettingsData } | undefined
  return root?.settings?.item ?? defaultSiteSettings
}
export function publicTitle(settings: SiteSettings, title?: string) {
  return title ? `${title} — ${settings.siteName}` : settings.siteName
}
export function homeTitle(settings: SiteSettings) {
  return settings.tagline
    ? `${settings.siteName} — ${settings.tagline}`
    : settings.siteName
}
export function publicMeta(
  settings: SiteSettings,
  title: string,
  description?: string | null,
) {
  const text = description || settings.description
  return [{ title }, ...(text ? [{ name: 'description', content: text }] : [])]
}
