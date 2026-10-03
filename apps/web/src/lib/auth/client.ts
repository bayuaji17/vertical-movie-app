import { createAuthClient } from '@repo/auth/client'

const configuredOrigin = import.meta.env.VITE_API_URL
const baseURL = configuredOrigin || undefined

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: 'include' },
})
