import { useContext } from 'react'
import { ThemeContext } from '#/lib/theme/context'

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemeProvider is required.')
  return context
}
