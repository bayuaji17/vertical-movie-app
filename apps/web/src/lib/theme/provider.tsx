import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { resolveTheme, themeMode, themeStorageKey } from './preferences'
import type { ThemeMode } from './preferences'

import { ThemeContext } from './context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [mode, setMode] = useState<ThemeMode>('system')
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === themeStorageKey || e.key === null)
        setMode(themeMode(e.newValue))
    }
    let stored: ThemeMode = 'system'
    try {
      stored = themeMode(localStorage.getItem(themeStorageKey))
    } catch {}
    setMode(stored)
    setInitialized(true)
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  useEffect(() => {
    if (!initialized) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = resolveTheme(mode, media.matches)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
      document.documentElement.style.colorScheme = resolved
      document.documentElement.dataset.themeMode = mode
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [mode, initialized])
  function select(next: ThemeMode) {
    setMode(next)
    try {
      localStorage.setItem(themeStorageKey, next)
    } catch {}
  }
  return (
    <ThemeContext value={{ mode, setMode: select }}>{children}</ThemeContext>
  )
}
