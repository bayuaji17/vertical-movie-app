import { createContext } from 'react'
import type { ThemeMode } from './preferences'

export const ThemeContext = createContext<{
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
} | null>(null)
