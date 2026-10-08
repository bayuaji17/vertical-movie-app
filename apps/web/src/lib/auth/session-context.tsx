import { createContext } from 'react'
import type { SessionSnapshot } from '@repo/auth/types'

export const AdminSessionContext = createContext<SessionSnapshot | null>(null)
