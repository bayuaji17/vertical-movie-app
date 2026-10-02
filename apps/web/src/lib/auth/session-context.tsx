import { createContext, useContext } from 'react'
import type { SessionSnapshot } from '@repo/auth/types'

export const AdminSessionContext = createContext<SessionSnapshot | null>(null)
export function useAdminPrincipal() {
  const value = useContext(AdminSessionContext)
  if (!value) throw new Error('An authorized admin layout is required.')
  return value
}
