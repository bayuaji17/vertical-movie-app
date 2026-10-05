import { expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import {
  themeMode,
  resolveTheme,
  themeBootstrap,
} from '../src/lib/theme/preferences'

test('theme preference normalizes invalid values and System follows the browser', () => {
  expect(themeMode('dark')).toBe('dark')
  expect(themeMode('invalid')).toBe('system')
  expect(resolveTheme('light', true)).toBe('light')
  expect(resolveTheme('dark', false)).toBe('dark')
  expect(resolveTheme('system', true)).toBe('dark')
  expect(resolveTheme('system', false)).toBe('light')
})
test('head bootstrap applies persisted/System modes before CSS and tolerates unavailable storage', () => {
  for (const stored of ['light', 'dark', 'system', 'invalid', null])
    for (const systemDark of [true, false]) {
      const element = {
        classList: {
          toggle(_name: string, dark: boolean) {
            this.dark = dark
          },
          dark: false,
        },
        style: { colorScheme: '' },
        dataset: { themeMode: '' },
      }
      runInNewContext(themeBootstrap, {
        localStorage: { getItem: () => stored },
        matchMedia: () => ({ matches: systemDark }),
        document: { documentElement: element },
      })
      expect(element.style.colorScheme).toBe(
        resolveTheme(themeMode(stored), systemDark),
      )
      expect(element.dataset.themeMode).toBe(themeMode(stored))
    }
  const element = {
    classList: { toggle() {} },
    style: { colorScheme: '' },
    dataset: { themeMode: '' },
  }
  runInNewContext(themeBootstrap, {
    localStorage: {
      getItem() {
        throw Error('disabled')
      },
    },
    matchMedia: () => ({ matches: true }),
    document: { documentElement: element },
  })
  expect(element.style.colorScheme).toBe('dark')
  expect(element.dataset.themeMode).toBe('system')
})
