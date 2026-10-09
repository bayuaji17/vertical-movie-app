import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { defaultSiteSettings } from '../src/lib/settings/model'
import {
  publicMeta,
  publicTitle,
  homeTitle,
  settingsFromMatches,
} from '../src/lib/settings/presentation'

test('public metadata preserves content title/description, defaults and empty omission', () => {
  const settings = {
    ...defaultSiteSettings,
    siteName: 'Brand',
    tagline: '',
    description: '',
  }
  expect(homeTitle(settings)).toBe('Brand')
  expect(publicTitle(settings, 'Film')).toBe('Film — Brand')
  expect(publicMeta(settings, 'Film — Brand', 'Story')).toEqual([
    { title: 'Film — Brand' },
    { name: 'description', content: 'Story' },
  ])
  expect(publicMeta(settings, 'Brand')).toEqual([{ title: 'Brand' }])
  expect(settingsFromMatches([])).toEqual(defaultSiteSettings)
  expect(
    settingsFromMatches([
      {
        routeId: '__root__',
        loaderData: { settings: { item: settings, version: 1, expiresAt: 0 } },
      },
    ]),
  ).toEqual(settings)
})
test('saved strings remain plain text in React and metadata helper', () => {
  const text = '<script>alert("literal")</script>',
    settings = { ...defaultSiteSettings, siteName: text }
  const html = renderToStaticMarkup(
    createElement('span', null, settings.siteName),
  )
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(publicTitle(settings)).toBe(text)
})
