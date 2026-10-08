import { useContext } from 'react'
import { AdminSessionContext } from '#/lib/auth/session-context'

export function useAdminPrincipal() {
  const value = useContext(AdminSessionContext)
  if (!value) throw new Error('An authorized admin layout is required.')
  return value
}
